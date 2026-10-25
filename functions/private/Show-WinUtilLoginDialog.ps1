function Show-WinUtilLoginDialog {
    <#
        .SYNOPSIS
            Shows the login window and returns what the user entered

        .DESCRIPTION
            WPF needs an STA thread, and the caller may be on an MTA one (PowerShell 7) or
            before the interface exists (the -Config and -Preset runs), so the window gets its
            own STA runspace and this function waits for it to close.

        .PARAMETER Message
            A line shown above the buttons, such as how many attempts are left.

        .OUTPUTS
            An object with Username and Password (SecureString), or $null when cancelled.
    #>
    param(
        [string]$Message = ""
    )

    $dialog = {
        param($Message)

        Add-Type -AssemblyName PresentationFramework

        [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WinUtil العربي — تسجيل الدخول" Width="380" SizeToContent="Height"
        WindowStartupLocation="CenterScreen" ResizeMode="NoResize" Topmost="True"
        FlowDirection="RightToLeft" Background="#0B1F14" FontFamily="Segoe UI">
    <StackPanel Margin="24">
        <TextBlock Text="تسجيل الدخول" FontSize="20" FontWeight="Bold" Foreground="#FFFFFF" Margin="0,0,0,4"/>
        <TextBlock Text="هذه النسخة خاصة. أدخل اسم المستخدم وكلمة المرور للمتابعة." Foreground="#86EFAC" TextWrapping="Wrap" Margin="0,0,0,16"/>
        <TextBlock Text="اسم المستخدم" Foreground="#DCFCE7" Margin="0,0,0,4"/>
        <TextBox Name="User" Height="32" FontSize="14" Padding="6,4" FlowDirection="LeftToRight"/>
        <TextBlock Text="كلمة المرور" Foreground="#DCFCE7" Margin="0,12,0,4"/>
        <PasswordBox Name="Pass" Height="32" FontSize="14" Padding="6,4" FlowDirection="LeftToRight"/>
        <TextBlock Name="Msg" Foreground="#FCA5A5" TextWrapping="Wrap" Margin="0,10,0,0"/>
        <StackPanel Orientation="Horizontal" Margin="0,18,0,0">
            <Button Name="Ok" Content="دخول" IsDefault="True" Width="110" Height="34" Background="#16A34A" Foreground="White" BorderThickness="0" FontWeight="Bold"/>
            <Button Name="Cancel" Content="إلغاء" IsCancel="True" Width="90" Height="34" Margin="10,0,0,0" Background="Transparent" Foreground="#DCFCE7" BorderBrush="#2F5F43"/>
        </StackPanel>
    </StackPanel>
</Window>
'@

        $window = [Windows.Markup.XamlReader]::Load([Xml.XmlNodeReader]::new($xaml))
        $user = $window.FindName("User")
        $pass = $window.FindName("Pass")
        $msg = $window.FindName("Msg")

        $msg.Text = $Message
        if ([string]::IsNullOrEmpty($Message)) {
            $msg.Visibility = "Collapsed"
        }

        $window.FindName("Ok").Add_Click({ $window.DialogResult = $true })
        $window.Add_ContentRendered({ [void]$user.Focus() })

        if ($window.ShowDialog()) {
            [pscustomobject]@{
                Username = $user.Text
                Password = $pass.SecurePassword
            }
        }
    }

    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.ApartmentState = "STA"
    $runspace.ThreadOptions = "ReuseThread"
    $runspace.Open()
    try {
        $shell = [powershell]::Create()
        $shell.Runspace = $runspace
        [void]$shell.AddScript($dialog.ToString()).AddArgument($Message)
        $result = $shell.Invoke()
        $shell.Dispose()
        return ($result | Select-Object -First 1)
    } finally {
        $runspace.Close()
    }
}
