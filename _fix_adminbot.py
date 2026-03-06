path = r'c:\Users\DEEPANSH\.gemini\antigravity\scratch\attashop\admin-bot\src\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Line 50 raw: {repr(lines[49])}")
# The actual content: "    '/analytics <char> View today\\'s analytics',\n"
# \\\\ in repr = \\ in actual string, then ' closes the string = BUG
# Fix: replace the whole line with a template-literal version
for i, line in enumerate(lines):
    if "View today\\\\'s analytics" in line or "View today\\'s analytics" in line:
        # Replace the single-quoted string with a template literal
        new_line = line.replace("\\\\'s analytics'", "\\'s analytics`")
        new_line = new_line.replace("'/analytics", "`/analytics")
        lines[i] = new_line
        print(f"Fixed line {i+1}: {lines[i].rstrip()}")
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done.")
