import QRCode from 'qrcode'

export async function generateQR(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 150, margin: 1, color: { dark: '#1E3A5F', light: '#FFFFFF' } })
}
