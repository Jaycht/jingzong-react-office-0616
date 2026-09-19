!macro customInit
  ; 强制默认安装目录为 D:\Program Files\JingZhenWork
  ; 用户仍可在安装时自定义路径（allowToChangeInstallationDirectory: true）
  StrCpy $INSTDIR "D:\Program Files\JingZhenWork"
!macroend

!macro customUnInstall
  ; 卸载时询问是否删除用户数据（localStorage + IndexedDB + 附件 + 文书库上传件）
  ;
  ; 【V2.49.0 修复】perMachine 安装（nsis.perMachine = true）下，卸载器整个流程都处于
  ; SetShellVarContext all 状态，此时 $APPDATA 指向 C:\ProgramData 而非当前用户目录。
  ; 原来那句 RMDir /r "$APPDATA\jingzong-work-log" 删的是一个根本不存在的目录，
  ; 所以用户点了「是」数据依然原样保留（用户名、记录都还在）。必须先切回 current 上下文。
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "是否同时删除所有用户数据（工作记录、附件、设置）？$\n$\n选择「是」将清除所有本地数据，不可恢复。$\n选择「否」则保留数据，下次安装可继续使用。" \
    IDNO skip_userdata

  SetShellVarContext current
  ; Electron 的 userData：IndexedDB / Local Storage / 登录用户名 / path-config.json
  ; 目录名取 package.json 的 name（jingzong-work-log），不是中文 productName
  RMDir /r "$APPDATA\jingzong-work-log"
  ; 自动更新器缓存
  RMDir /r "$LOCALAPPDATA\jingzong-work-log-updater"
  ; 附件与文书库/典法查阅的上传文件：默认落在非系统盘的 jingzong_data 目录
  RMDir /r "D:\jingzong_data"
  RMDir /r "E:\jingzong_data"
  RMDir /r "F:\jingzong_data"
  RMDir /r "G:\jingzong_data"
  RMDir /r "H:\jingzong_data"
  SetShellVarContext all

  skip_userdata:
!macroend
