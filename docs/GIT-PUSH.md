# Публикация с личного GitHub-аккаунта

Этот репозиторий настроен локально на аккаунт `pepe1az`:

- `origin`: `git@github.com:pepe1az/web_express.git`;
- автор: Коряушкин Кирилл Русланович;
- email: `195776369+pepe1az@users.noreply.github.com`;
- SSH использует только отдельный ключ `~/.ssh/web_express_github_ed25519`, без SSH-агента и общего SSH-конфига.

Глобальные настройки Git и настройки других репозиториев не изменялись. Локальные параметры находятся в `.git/config` и не публикуются. На другом устройстве их нужно задать заново.

## Первое подключение

1. Войдите в GitHub именно как **pepe1az**.
2. Откройте https://github.com/settings/ssh/new, выберите тип **Authentication Key**, название, например `Personal laptop — web_express`.
3. Скопируйте публичный ключ:

```bash
cat ~/.ssh/web_express_github_ed25519.pub
```

4. Добавьте в GitHub всю строку, начинающуюся с `ssh-ed25519`.
5. Проверьте личную учётную запись:

```bash
ssh -F /dev/null -i ~/.ssh/web_express_github_ed25519 \
  -o IdentitiesOnly=yes -o IdentityAgent=none -T git@github.com
```

Успешный ответ начинается с `Hi pepe1az!`. GitHub не предоставляет SSH-оболочку, поэтому завершение команды с кодом 1 при таком приветствии нормально. При первом подключении SSH может запросить подтверждение ключа сервера; сверить отпечаток можно в официальной документации ниже.

## Push

Первый коммит уже создан локально. После добавления ключа:

```bash
cd ~/ucheba/web_express
git push -u origin main
```

Для последующих изменений:

```bash
git status
git add .
git diff --cached --stat
git commit -m "Описание изменений"
git push
```

Приватный ключ без `.pub`, файл `.env`, API-токен и параметры доступа к рабочей БД не добавляйте в репозиторий. Приватные материалы для Moodle хранятся отдельно. Если используются внешние `GIT_SSH_COMMAND`, `GIT_AUTHOR_EMAIL` или `GIT_COMMITTER_EMAIL`, они могут переопределить локальные настройки: в обычном терминале оставьте их незаданными.

## Ссылка для сдачи

После push получите точный commit:

```bash
git rev-parse HEAD
```

В тему Moodle можно вставить ссылку вида `https://github.com/pepe1az/web_express/tree/<полный-commit>`. Если репозиторий приватный, отдельно предоставьте преподавателю доступ либо приложите публичный ZIP исходников без секретов.

Официальная документация:

- https://docs.github.com/en/account-and-profile/how-tos/account-management/managing-multiple-accounts
- https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
