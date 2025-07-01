@echo off
set SERVER=62.113.58.42
set USERNAME=root
set PASSWORD=57246Abs
set LOCAL_DIR="B:\Projects Vue\admission_universitet\dist"
set REMOTE_DIR=/root/admission-university

set ARCHIVE_PATH="B:\Projects Vue\admission_universitet\dist.tar.gz"

echo Creating archive excluding node_modules...

REM node_modules papkasini chetlab o‘tib arxiv yaratish
tar --exclude=".idea" --exclude="node_modules" --exclude=".git" --exclude="init.bat" --exclude="dist" -czvf %ARCHIVE_PATH% -C "B:\Projects Vue\admission_universitet" .


echo Starting SCP upload...

REM SCP orqali arxivni yuklash
scp %ARCHIVE_PATH% %USERNAME%@%SERVER%:%REMOTE_DIR%

echo Files uploaded. Extracting on server and starting project...

REM SSH orqali serverda arxivni ochish va `node index.js` buyrug'ini ishga tushirish
ssh %USERNAME%@%SERVER% "cd %REMOTE_DIR% && tar -xzvf dist.tar.gz && npm install && tsc "
ssh %USERNAME%@%SERVER% "cd %REMOTE_DIR% && rm dist.tar.gz && cp .env dist/.env && pm2 stop index && pm2 start /root/admission-university/dist/index.js --env production  --name qabul --max-memory-restart 100M"

echo Project started on server.
pause
