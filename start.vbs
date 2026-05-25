Dim shell, port, url, fso, nodeExe, scriptPath, browser, found
port = 51730
url = "http://localhost:" & port & "/"

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Find node.exe
nodeExe = ""
Dim nodePaths, np
nodePaths = Array( _
    Environ("ProgramFiles") & "\nodejs\node.exe", _
    Environ("ProgramFiles(x86)") & "\nodejs\node.exe", _
    Environ("LocalAppData") & "\fnm\nodejs\node.exe", _
    "C:\Program Files\nodejs\node.exe", _
    "C:\Program Files (x86)\nodejs\node.exe" _
)
For Each np In nodePaths
    If fso.FileExists(np) Then
        nodeExe = np
        Exit For
    End If
Next

' Also try where command
If nodeExe = "" Then
    On Error Resume Next
    Dim tmp
    tmp = shell.Exec("where node").StdOut.ReadLine()
    If Err.Number = 0 And tmp <> "" Then
        nodeExe = tmp
    End If
    On Error GoTo 0
End If

If nodeExe = "" Then
    MsgBox "Node.js not found. Please install Node.js first.", vbExclamation, "Jingzong"
    WScript.Quit
End If

' Start Node.js server (hidden window)
scriptPath = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "server.js")
shell.Run """" & nodeExe & """ """ & scriptPath & """", 0, False

' Wait for server to start
WScript.Sleep 2000

' Find browser (Chrome or Edge)
found = False
browser = ""

On Error Resume Next
Dim regVal
regVal = shell.RegRead("HKCR\ChromeHTML\shell\open\command\")
If Err.Number = 0 Then
    browser = Left(regVal, InStr(regVal, ".exe") + 3)
    If InStr(browser, """") = 1 Then
        browser = Mid(browser, 2, InStr(2, browser, """") - 2)
    End If
    found = True
End If
On Error GoTo 0

If Not found Then
    On Error Resume Next
    regVal = shell.RegRead("HKCR\MSEdgeHTM\shell\open\command\")
    If Err.Number = 0 Then
        browser = Left(regVal, InStr(regVal, ".exe") + 3)
        If InStr(browser, """") = 1 Then
            browser = Mid(browser, 2, InStr(2, browser, """") - 2)
        End If
        found = True
    End If
    On Error GoTo 0
End If

If Not found Then
    Dim paths, p
    paths = Array( _
        Environ("ProgramFiles") & "\Google\Chrome\Application\chrome.exe", _
        Environ("LocalAppData") & "\Google\Chrome\Application\chrome.exe", _
        Environ("ProgramFiles") & "\Microsoft\Edge\Application\msedge.exe", _
        Environ("LocalAppData") & "\Microsoft\Edge\Application\msedge.exe" _
    )
    For Each p In paths
        If fso.FileExists(p) Then
            browser = p
            found = True
            Exit For
        End If
    Next
End If

If Not found Then
    MsgBox "Please install Chrome or Edge browser.", vbExclamation, "Jingzong"
    WScript.Quit
End If

' Launch in app mode (no address bar, no tabs)
shell.Run """" & browser & """ --app=" & url & " --no-default-browser-check", 1, False
