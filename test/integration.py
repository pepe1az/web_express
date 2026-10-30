"""Run against HTTPS and an independently connected reviewer database.
Requires psycopg[binary], TODO_BASE, TODO_TOKEN, TODO_REVIEWER_DSN.
Only test data with a unique runId is inserted; it is removed in finally.
"""
import json, os, uuid, urllib.request, urllib.error
from datetime import datetime, timezone
import psycopg

base = os.environ['TODO_BASE'].rstrip('/')
token = os.environ['TODO_TOKEN']
run_id = 'verify_' + uuid.uuid4().hex[:16]
checks = 0

def call(path, method='GET', data=None, status=200, authorized=True, raw=None):
    global checks
    headers = {'Authorization': 'Bearer ' + token} if authorized else {}
    if data is not None or raw is not None: headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(base + path, method=method, headers=headers,
        data=raw if raw is not None else (json.dumps(data).encode() if data is not None else None))
    try: response = urllib.request.urlopen(req, timeout=15)
    except urllib.error.HTTPError as error: response = error
    with response:
        body = response.read()
        assert response.status == status, (method, path, response.status, body)
        if path.startswith('/api/') and body:
            assert response.headers['Content-Type'].startswith('application/json')
            result = json.loads(body)
        else: result = body.decode()
        if status >= 400: assert isinstance(result.get('error'), str)
        if status == 204: assert body == b''
    checks += 1
    return result

with psycopg.connect(os.environ['TODO_REVIEWER_DSN'], autocommit=True) as db:
    try:
        assert call('/login/', authorized=False) == 'pepe1az'
        for path in ['/api/author/', '/api/tasks/?runId=x', '/api/tasks/not-a-uuid/']:
            call(path, authorized=False, status=401)
        author = call('/api/author/')
        assert author == {'login':'pepe1az','fullName':'Коряушкин Кирилл Русланович'}
        assert call('/api/tasks/?runId=' + run_id) == []
        for suffix in ['', '?runId=', '?runId=a%20b', '?runId=a&runId=b', '?runId=' + 'a'*65]:
            call('/api/tasks/' + suffix, status=400)
        for invalid in [{}, {'title':'x'}, {'title':' ', 'runId':run_id}, {'title':1,'runId':run_id},
                        {'title':'x'*201,'runId':run_id}, {'title':'x','runId':'русский'},
                        {'title':'x','runId':run_id,'done':True}, {'title':'x','runId':run_id,'ownerLogin':'other'},
                        {'title':'x','runId':run_id,'id':str(uuid.uuid4())}, []]:
            call('/api/tasks/', 'POST', invalid, 400)
        call('/api/tasks/', 'POST', status=400, raw=b'{invalid')
        task = call('/api/tasks/', 'POST', {'title':'  Проверка API → БД  ', 'runId':run_id}, 201)
        assert set(task) == {'id','ownerLogin','title','done','runId','createdAt'}
        uuid.UUID(task['id']); assert task['ownerLogin']=='pepe1az' and task['done'] is False
        assert task['title']=='Проверка API → БД' and task['runId']==run_id
        created = datetime.fromisoformat(task['createdAt'].replace('Z','+00:00'))
        assert task['createdAt'].endswith('Z') and abs((datetime.now(timezone.utc)-created).total_seconds())<60
        path='/api/tasks/'+task['id']+'/'
        row=db.execute('SELECT title, done, owner_login FROM tasks WHERE id=%s',[task['id']]).fetchone()
        assert row==('Проверка API → БД',False,'pepe1az')
        for invalid in [{}, {'done':'true'}, {'done':1}, {'title':' '}, {'runId':'other'}, {'ownerLogin':'other'}, {'createdAt':'now'}]:
            call(path,'PATCH',invalid,400)
        updated=call(path,'PATCH',{'title':'Изменено через API','done':True})
        assert updated['createdAt']==task['createdAt'] and updated['done'] is True
        assert db.execute('SELECT title,done FROM tasks WHERE id=%s',[task['id']]).fetchone()==('Изменено через API',True)
        db.execute('UPDATE tasks SET title=%s,done=false WHERE id=%s',['Изменено напрямую в БД',task['id']])
        assert call(path)['title']=='Изменено напрямую в БД'
        assert call('/api/tasks/?runId='+run_id)[0]['done'] is False
        direct=str(uuid.uuid4())
        db.execute('INSERT INTO tasks VALUES (%s,%s,%s,false,%s,now())',[direct,'pepe1az','Добавлено напрямую',run_id])
        assert len(call('/api/tasks/?runId='+run_id))==2
        call('/api/tasks/'+direct+'/','DELETE',status=204)
        assert db.execute('SELECT 1 FROM tasks WHERE id=%s',[direct]).fetchone() is None
        call('/api/tasks/'+direct+'/',status=404)
        db.execute('DELETE FROM tasks WHERE id=%s',[task['id']])
        for method in ['GET','DELETE']: call(path,method,status=404)
        call(path,'PATCH',{'done':False},404)
        for method in ['GET','DELETE']: call('/api/tasks/not-a-uuid/',method,status=400)
        call('/api/tasks/not-a-uuid/','PATCH',{'done':True},400)
        outsider=str(uuid.uuid4())
        db.execute('INSERT INTO tasks VALUES (%s,%s,%s,false,%s,now())',[outsider,'other','Чужое дело',run_id])
        assert call('/api/tasks/?runId='+run_id)==[]
        call('/api/tasks/'+outsider+'/',status=404)
        call('/api/tasks/'+outsider+'/','PATCH',{'title':'not allowed'},404)
        call('/api/tasks/'+outsider+'/','DELETE',status=404)
        try: db.execute('CREATE TABLE should_not_be_allowed (id int)')
        except psycopg.errors.InsufficientPrivilege: pass
        else: raise AssertionError('Reviewer unexpectedly has DDL rights')
        print(f'PASS: {checks} HTTPS requests, independent PostgreSQL CRUD, isolation and reviewer restrictions')
    finally:
        db.execute('DELETE FROM tasks WHERE run_id=%s',[run_id])
