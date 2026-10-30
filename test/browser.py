"""Browser CRUD check. Requires playwright, installed Chrome, TODO_BASE and TODO_TOKEN."""
import os, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
base=os.environ['TODO_BASE'].rstrip('/')
token=os.environ['TODO_TOKEN']
run_id='browser_'+uuid.uuid4().hex[:12]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base)
    page.locator('#token').fill(token)
    page.get_by_role('button',name='Открыть список').click()
    expect(page.locator('#workspace')).to_be_visible()
    expect(page.locator('#author-name')).to_have_text('Коряушкин Кирилл Русланович')
    page.locator('#run-id').fill(run_id)
    page.get_by_role('button',name='Показать',exact=True).click()
    expect(page.locator('#status')).to_contain_text(run_id)
    page.locator('#new-title').fill('Браузерная проверка')
    page.get_by_role('button',name='Добавить дело',exact=True).click()
    expect(page.locator('.task-title')).to_have_text('Браузерная проверка')
    page.get_by_role('button',name='Изменить: Браузерная проверка',exact=True).click()
    page.locator('#edit-title').fill('Изменено в браузере')
    page.get_by_role('button',name='Сохранить',exact=True).click()
    expect(page.locator('.task-title')).to_have_text('Изменено в браузере')
    page.get_by_role('checkbox',name='Выполнение: Изменено в браузере',exact=True).check()
    expect(page.locator('.task')).to_have_class('task completed')
    page.get_by_role('button',name='В работе',exact=True).click()
    expect(page.locator('.task')).to_have_count(0)
    page.get_by_role('button',name='Готово',exact=True).click()
    expect(page.locator('.task')).to_have_count(1)
    page.get_by_role('button',name='Удалить: Изменено в браузере',exact=True).click()
    page.locator('#delete-dialog').get_by_role('button',name='Удалить',exact=True).click()
    expect(page.locator('.task')).to_have_count(0)
    page.get_by_role('button',name='Все',exact=True).click()
    page.locator('#run-id').fill('manual')
    page.get_by_role('button',name='Показать',exact=True).click()
    expect(page.locator('#status')).to_contain_text('manual')
    title='Итоговая работа 24.10.2026: pepe1az'
    if page.locator('.task-title').filter(has_text=title).count()==0:
        page.locator('#new-title').fill(title)
        page.get_by_role('button',name='Добавить дело',exact=True).click()
        expect(page.locator('.task-title').filter(has_text=title)).to_have_count(1)
    page.locator('#status').wait_for(state='hidden')
    screenshots=Path(os.environ.get('TODO_SCREENSHOTS','/tmp/todo-screenshots'))
    screenshots.mkdir(exist_ok=True,parents=True)
    page.screenshot(path=str(screenshots/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(screenshots/'mobile.png'),full_page=True)
    page.reload()
    expect(page.locator('#auth-panel')).to_be_visible()
    expect(page.locator('#workspace')).to_be_hidden()
    assert page.evaluate('localStorage.length')==0
    assert page.evaluate('sessionStorage.length')==0
    assert not errors,errors
    browser.close()
    print('PASS: real-browser login, CRUD, filters, responsive layout, token not persisted; manual task created through UI')
