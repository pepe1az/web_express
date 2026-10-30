# Развёртывание

`nginx.conf` и `pepelaz-todo.service` — конфигурация работающего экземпляра, без секретов. Порт приложения 8090 доступен только на loopback; HTTPS — 9443. На другом сервере замените имя домена, пути к сертификату и установленному Node.js.

1. Скопируйте проект в `/opt/pepelaz-todo`, выполните `npm ci` с Node.js 24.
2. Создайте отдельную PostgreSQL-базу и примените SQL из README от администратора.
3. Создайте `/etc/pepelaz-todo.env` по `.env.example`, задайте реальные переменные, установите права `0600 root:root`. `EnvironmentFile` загружает systemd, приложение не получает права читать чужие файлы.
4. Установите unit, выполните `systemctl daemon-reload` и `systemctl enable --now pepelaz-todo`.
5. Настройте сертификат, установите nginx-конфигурацию, выполните `nginx -t` и reload. Разрешите входящий HTTPS-порт в firewall.
6. Сохраните PostgreSQL на loopback. Для преподавателя выделите отдельную SQL-роль только с CRUD над `tasks`, ограничьте число соединений и время запросов.
7. После согласования SSH-туннеля используйте отдельную системную учётную запись без оболочки. Ограничьте `AllowTcpForwarding local`, `PermitOpen 127.0.0.1:5432`, `PermitListen none`, `PermitTTY no`, `AllowAgentForwarding no`, `X11Forwarding no`, `ForceCommand /bin/false`. В authorized_keys допустим только выделенный ключ с `restrict,port-forwarding,permitopen="127.0.0.1:5432"`. До перезагрузки SSH обязательно выполните `sshd -t`.

Не открывайте порт PostgreSQL для всего интернета. Реквизиты работающего экземпляра и SSH-ключ проверяющего передаются отдельно, их нет в исходниках.

Перед повторной проверкой убедитесь, что `systemctl is-active pepelaz-todo postgresql@16-main` возвращает active, а GET `/login/` по HTTPS возвращает `pepe1az`. Регулярно делайте резервную копию учебной БД и оставьте сервис включённым на период оценивания.
