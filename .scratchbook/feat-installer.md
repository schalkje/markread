I want to sign my private app, that I am developing solo, as a private person; and distribute through github.

There is already an installer created as part of the deployment; but it needs to be improved and signed.

Goal: ship the MSI without “Unknown publisher” warnings.
You want to:
- Sign your MSI with your self-signed certificate on your dev laptop.
- Install the same certificate’s public part on another laptop (so Windows trusts it).
- Then install your signed MSI without publisher warnings.

I don't want to make any cost, as I want to test this application before spending money for a Code Signing cert from a reputable CA.
Certificates and keys should be stored in github (GitHub Secrets)

There should be a github action to create the installer.


If I sign with a self-signed certificate, can I get it installed on another laptop?
Yes ✅ — you can use a self-signed code-signing certificate on another laptop, but it takes a manual trust setup on every device where you want your MSI (or EXE) to install without warnings.