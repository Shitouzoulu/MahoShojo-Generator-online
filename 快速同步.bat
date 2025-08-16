@echo off
chcp 65001 >nul
title 魔法少女生成器 - 快速同步到GitHub

echo ========================================
echo 魔法少女生成器 - 快速同步到GitHub
echo ========================================
echo.

echo [信息] 正在检查Git环境...
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Git未安装或不在PATH中
    echo 请先安装Git: https://git-scm.com/downloads
    echo 安装时请选择"Add to PATH"选项
    pause
    exit /b 1
)

echo [成功] Git环境检查通过
echo.

echo [信息] 当前目录: %CD%
echo [信息] 目标仓库: https://github.com/Shitouzoulu/MahoShojo-Generator-online
echo [信息] 目标分支: dev
echo.

echo [信息] 开始同步流程...
echo.

:: 切换到dev分支
echo [步骤1] 切换到dev分支...
git checkout dev
if errorlevel 1 (
    echo [警告] 切换分支失败，可能分支不存在
)

:: 拉取最新代码
echo [步骤2] 拉取最新代码...
git pull origin dev
if errorlevel 1 (
    echo [警告] 拉取失败，可能没有远程分支
)

:: 检查状态
echo [步骤3] 检查更改状态...
git status --porcelain > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if defined STATUS (
    echo [信息] 发现未提交的更改，正在处理...
    echo.
    
    :: 添加所有文件
    echo [步骤4] 添加所有文件...
    git add .
    
    :: 提交更改
    echo [步骤5] 提交更改...
    git commit -m "Update: 同步项目到GitHub - %date% %time%"
    
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
echo [步骤6] 推送到GitHub...
git push origin dev

if errorlevel 1 (
    echo [错误] 推送失败
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. GitHub权限问题
    echo 3. 需要配置SSH密钥或Personal Access Token
    echo.
    echo 请检查网络连接和GitHub权限设置
    pause
    exit /b 1
)

echo.
echo ========================================
echo [成功] 项目已成功同步到GitHub！
echo ========================================
echo.
echo 仓库地址: https://github.com/Shitouzoulu/MahoShojo-Generator-online
echo 分支: dev
echo 同步时间: %date% %time%
echo.

echo [信息] 远程仓库信息:
git remote -v

echo.
echo [提示] 您可以在GitHub上查看更新的代码
echo [提示] 如需部署到服务器，请使用项目中的部署脚本
echo.
pause
