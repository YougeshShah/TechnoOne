import sys

# Run this from the portal-mobile/ root directory. Run AFTER patch_ai_content_dropdown.py.

path = 'app/ai-content.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''      <View style={styles.langRow}>
        <TouchableOpacity style={[styles.langChip, language === "en" && styles.typeChipActive]} onPress={() => setLanguage("en")}>
          <Text style={[styles.typeChipText, language === "en" && styles.typeChipTextActive]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langChip, language === "ne" && styles.typeChipActive]} onPress={() => setLanguage("ne")}>
          <Text style={[styles.typeChipText, language === "ne" && styles.typeChipTextActive]}>Nepali</Text>
        </TouchableOpacity>
      </View>'''

new1 = '''      <View style={styles.langRow}>
        <TouchableOpacity style={[styles.langChip, language === "en" && styles.langChipActive]} onPress={() => setLanguage("en")}>
          <Text style={[styles.langChipText, language === "en" && styles.langChipTextActive]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langChip, language === "ne" && styles.langChipActive]} onPress={() => setLanguage("ne")}>
          <Text style={[styles.langChipText, language === "ne" && styles.langChipTextActive]}>Nepali</Text>
        </TouchableOpacity>
      </View>'''

c1 = content.count(old1)
print(f'lang-row anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (lang row).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  langRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  langChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8 },'''

new2 = '''  langRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  langChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { fontSize: 13, color: "#374151" },
  langChipTextActive: { color: "#fff", fontWeight: "600" },'''

c2 = content.count(old2)
print(f'lang-styles anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (lang styles).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/ai-content.tsx (fixed language chip styles)')
