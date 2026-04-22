from PIL import Image
img = Image.open(r'c:\Users\Administrator\Desktop\CDR-STUDIO-main\electron-build\icon.png')
img = img.resize((256, 256), Image.LANCZOS)
img.save(
    r'c:\Users\Administrator\Desktop\CDR-STUDIO-main\electron-build\icon.ico',
    format='ICO',
    sizes=[(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
)
print('icon.ico creado exitosamente!')
