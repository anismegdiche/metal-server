// //
// //
// //
// //
// //
// import { execSync } from 'child_process'
// import os from 'os'
// import fs from 'fs'
// import crypto from 'crypto'
// import { Logger } from "../../utils/Logger"
// import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
// import { HttpErrorUnauthorized, HttpErrorInternalServerError } from "../../server/HttpErrors"
// import { TUserTokenInfo } from "../../server/User"
// import { TConfigUsers } from "../../types/TConfig"


// //
// const WIN_CMD = `$adsi = [ADSI]"WinNT://$env:COMPUTERNAME"
// $adsi.Children | where {$_.SchemaClassName -eq 'user'} | Foreach-Object {
//     $groups = $_.Groups() | Foreach-Object {$_.GetType().InvokeMember("Name", 'GetProperty', $null, $_, $null)}
//     $_ | Select-Object @{n='name';e={$_.Name}},@{n='groups';e={$groups -join ';'}}
// }`

// //
// export class SystemAuth extends ACAuthProvider {
    
//     #Platform: string
//     private cachedUsers: TConfigUsers = {}

//     constructor() {
//         super()
//         this.#Platform = os.platform()
//     }

//     private async updateUserCache(): Promise<void> {
//         try {
//             const users: TConfigUsers = {}

//             if (this.#Platform === 'win32') {
//                 const output = execSync(`powershell -Command "${WIN_CMD.replace(/"/g,'""')} | ConvertTo-Json"`)
//                 const users = JSON.parse(output.toString())

//                 const userNames = users.map((user: any) => user.Name)

//                 for (const username of userNames) {
//                     try {
//                         // Get detailed user info
//                         const userInfo = execSync(`powershell -Command "Get-LocalUser -Name '${username}'"`, { encoding: 'utf8' })
//                         const isDisabled = JSON.parse(userInfo).Enabled === false

//                         // eslint-disable-next-line max-depth
//                         if (!isDisabled) {
//                             // Get user groups
//                             const groupInfo = execSync(`powershell -Command "Get-LocalGroup -Member '${username}'"`, { encoding: 'utf8' })
//                             const groups = JSON.parse(groupInfo).map((group: any) => group.Name)

//                             users[username] = {
//                                 roles: [...new Set(['local_user', ...groups.map((g:any) => g.toLowerCase())])],
//                                 password: ''
//                             }
//                         }
//                     } catch (error: any) {
//                         Logger.Error(`Error processing user ${username}:${error.message}`)
//                     }
//                 }
//             } else if (this.#Platform === 'linux') {
//                 // Read /etc/passwd directly
//                 const passwdContent = fs.readFileSync('/etc/passwd', 'utf-8')
//                 const lines = passwdContent.split('\n').filter(Boolean)

//                 for (const line of lines) {
//                     const [username, , uid] = line.split(':')
//                     // Skip system users (UID < 1000 typically)
//                     if (parseInt(uid, 10) >= 1000) {
//                         // eslint-disable-next-line max-depth
//                         try {
//                             // Get user groups using id command
//                             const groupOutput = execSync(`id -Gn ${username}`, { encoding: 'utf8' })
//                             const groups = groupOutput.trim().split(' ')

//                             users[username] = {
//                                 roles: [...new Set(['local_user', ...groups.map(g => g.toLowerCase())])],
//                                 password: ''
//                             }
//                         } catch (error: any) {
//                             Logger.Error(`Error getting groups for user ${username}:${error.message}`)
//                             users[username] = {
//                                 roles: ['local_user'],
//                                 password: ''
//                             }
//                         }
//                     }
//                 }
//             }

//             this.cachedUsers = users
//         } catch (error: any) {
//             Logger.Error(`Error updating user cache:${error.message}`)
//             throw new HttpErrorInternalServerError("Failed to update user cache")
//         }
//     }

//     private async authenticateWindows(username: string, password: string): Promise<boolean> {
//         try {
//             // Create a temporary script to test credentials
//             const scriptContent = `
//                 $ErrorActionPreference = 'Stop'
//                 $username = '${username}'
//                 $password = '${password}'
//                 Add-Type -AssemblyName System.DirectoryServices.AccountManagement
//                 $PC = New-Object System.DirectoryServices.AccountManagement.PrincipalContext('Machine')
//                 $result = $PC.ValidateCredentials($username, $password)
//                 if ($result) { exit 0 } else { exit 1 }
//             `

//             const tempFile = `${os.tmpdir()}\\auth_${crypto.randomBytes(4).toString('hex')}.ps1`
//             fs.writeFileSync(tempFile, scriptContent, { encoding: 'utf8' })

//             try {
//                 execSync(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, { stdio: 'ignore' })
//                 return true
//             } catch {
//                 return false
//             } finally {
//                 // Cleanup
//                 try {
//                     fs.unlinkSync(tempFile)
//                 } catch (error: any) {
//                     Logger.Error(`Error cleaning up temp file:${error.message}`)
//                 }
//             }
//         } catch (error: any) {
//             Logger.Error(`Windows authentication error:${error.message}`)
//             return false
//         }
//     }

//     private async authenticateLinux(username: string, password: string): Promise<boolean> {
//         try {
//             // Create a temporary script to test auth using su
//             const scriptContent = `#!/bin/bash
//             echo '${password}' | su ${username} -c 'exit' &>/dev/null
//             exit $?`

//             const tempFile = `/tmp/auth_${crypto.randomBytes(4).toString('hex')}`
//             fs.writeFileSync(tempFile, scriptContent, {
//                 mode: 0o700,
//                 encoding: 'utf8'
//             })

//             try {
//                 execSync(tempFile, { stdio: 'ignore' })
//                 return true
//             } catch {
//                 return false
//             } finally {
//                 // Cleanup
//                 try {
//                     fs.unlinkSync(tempFile)
//                 } catch (error: any) {
//                     Logger.Error(`Error cleaning up temp file:${error.message}`)
//                 }
//             }
//         } catch (error: any) {
//             Logger.Error(`Linux authentication error:${error.message}`)
//             return false
//         }
//     }

//     @Logger.LogFunction()
//     Init(): void {
//         try {
//             // Initialize and cache system users
//             this.updateUserCache()
//             Logger.Debug(`SystemAuthProvider initialized for ${this.#Platform} platform`)
//         } catch (error: any) {
//             Logger.Error(`Initialization error:${error.message}`)
//             throw new HttpErrorInternalServerError("Failed to initialize SystemAuthProvider")
//         }
//     }

//     GetUsers(): TConfigUsers {
//         return this.cachedUsers
//     }

//     async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
//         const { username, password } = userCredentials

//         if (!username || !password) {
//             throw new HttpErrorUnauthorized("Username and password are required")
//         }

//         // Check if user exists in our cache
//         const userInfo = this.cachedUsers[username]
//         if (!userInfo) {
//             throw new HttpErrorUnauthorized("Invalid username or password")
//         }

//         let isAuthenticated = false
//         try {
//             if (this.#Platform === 'win32') {
//                 isAuthenticated = await this.authenticateWindows(username, password)
//             } else if (this.#Platform === 'linux') {
//                 isAuthenticated = await this.authenticateLinux(username, password)
//             } else {
//                 throw new HttpErrorInternalServerError(`Unsupported platform: ${this.#Platform}`)
//             }

//             if (!isAuthenticated) {
//                 throw new HttpErrorUnauthorized("Invalid username or password")
//             }

//             return {
//                 user: username,
//                 roles: userInfo.roles
//             }

//         } catch (error: any) {
//             if (error instanceof HttpErrorUnauthorized) {
//                 throw error
//             }
//             Logger.Error(`Authentication error:${error.message}`)
//             throw new HttpErrorInternalServerError("Authentication failed due to system error")
//         }
//     }

//     async LogOut(username: string): Promise<void> {
//         Logger.Debug(`Local user ${username} logged out`)
//     }
// }