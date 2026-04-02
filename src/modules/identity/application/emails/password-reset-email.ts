export function PasswordResetEmail(
  name: string,
  resetLink: string,
): { subject: string; body: string } {
  const subject = 'Recupere sua senha — WavePlay'

  const body = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0; padding:0; background:#0f0f0f;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px; background:#0f0f0f;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#1a1a2e; border-radius:16px;">

          <!-- Header -->
          <tr>
            <td style="padding:48px 32px 32px 32px; text-align:center; background:#6d28d9; border-radius:16px 16px 0 0;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                WavePlay
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 32px 48px 32px; text-align:center;">

              <h2 style="margin:0 0 12px 0; color:#ffffff; font-size:22px; font-weight:600; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${name}, recebemos seu pedido
              </h2>

              <p style="margin:0 0 32px 0; color:#a0a0b0; font-size:16px; line-height:1.6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Clique no botão abaixo para redefinir sua senha:
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px auto;">
                <tr>
                  <td style="background:#6d28d9; border-radius:8px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block; padding:16px 40px; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      Redefinir senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0; color:#a0a0b0; font-size:14px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Este link expira em <strong style="color:#ffffff;">15 minutos</strong>.
              </p>

              <p style="margin:0 0 16px 0; color:#6b6b80; font-size:14px; line-height:1.6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Se você não solicitou a recuperação de senha, ignore este email. Sua conta permanece segura.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px; background:#141424; text-align:center; border-radius:0 0 16px 16px;">
              <p style="margin:0; color:#6b6b80; font-size:13px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Nunca compartilhe este link com outras pessoas.
              </p>
              <p style="margin:6px 0 0 0; color:#6b6b80; font-size:13px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Equipe <strong style="color:#a0a0b0;">WavePlay</strong>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`

  return { subject, body }
}
