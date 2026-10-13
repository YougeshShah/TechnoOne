import sys

path = "app/recording-player.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''      <VideoView player={player} style={styles.video} allowsFullscreen allowsPictureInPicture nativeControls />'''
new = '''      <VideoView player={player} style={styles.video} allowsPictureInPicture nativeControls />'''

c = content.count(old)
print(f"anchor count = {c}")
if c != 1:
    print("ERROR: aborting.")
    sys.exit(1)
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched app/recording-player.tsx (removed unsupported allowsFullscreen prop)")
