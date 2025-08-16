@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo 魔法少女生成器 - GitHub同步脚本
echo ========================================
echo.

:: 设置参数
set "COMMIT_MESSAGE=Update: 同步项目到GitHub"
set "BRANCH=dev"

:: 检查git是否可用
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Git未安装或不在PATH中，请先安装Git
    pause
    exit /b 1
)

echo [信息] Git版本检查通过
echo.

:: 检查当前目录是否为git仓库
if not exist ".git" (
    echo [错误] 当前目录不是git仓库
    pause
    exit /b 1
)

:: 检查远程仓库
for /f "tokens=2" %%i in ('git remote get-url origin 2^>nul') do set "REMOTE_URL=%%i"
if not defined REMOTE_URL (
    echo [错误] 未配置远程仓库origin
    pause
    exit /b 1
)

echo [信息] 远程仓库: %REMOTE_URL%
echo.

:: 检查当前分支
for /f "tokens=2" %%i in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%i"
echo [信息] 当前分支: %CURRENT_BRANCH%

:: 如果不在目标分支上，切换到目标分支
if not "%CURRENT_BRANCH%"=="%BRANCH%" (
    echo [信息] 切换到分支: %BRANCH%
    git checkout %BRANCH%
    if errorlevel 1 (
        echo [错误] 切换分支失败
        pause
        exit /b 1
    )
)

:: 拉取最新代码
echo [信息] 拉取最新代码...
git pull origin %BRANCH%
if errorlevel 1 (
    echo [警告] 拉取代码失败，可能没有远程分支
)

:: 检查状态
echo [信息] 检查git状态...
git status --porcelain > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if defined STATUS (
    echo [信息] 发现未提交的更改:
    git status --porcelain
    
    :: 添加所有文件
    echo [信息] 添加所有文件...
    git add .
    
    :: 提交更改
    echo [信息] 提交更改: %COMMIT_MESSAGE%
    git commit -m "%COMMIT_MESSAGE%"
    
    if errorlevel 1 (
        echo [错误] 提交失败
        pause
        exit /b 1
    )
    
    echo [成功] 更改已提交
) else (
    echo [信息] 没有未提交的更改
)

:: 推送到远程仓库
echo [信息] 推送到远程仓库...
git push origin %BRANCH%

if errorlevel 1 (
    echo [错误] 推送失败
    pause
    exit /b 1
)

echo [成功] 项目已成功同步到GitHub仓库！
echo [信息] 仓库地址: %REMOTE_URL%
echo [信息] 分支: %BRANCH%
echo.

:: 显示远程仓库信息
echo [信息] 远程仓库信息:
git remote -v

echo.
echo [成功] 同步完成！
echo.
pause
