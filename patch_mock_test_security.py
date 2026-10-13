import os

print("Applying Mock Test Security and Anti-Cheat Patches...")

# 1. Update Web Mock Test Component (if it exists)
web_mock_paths = [
    "student-web/src/pages/MockTest.tsx",
    "student-web/src/pages/mock-test.tsx",
    "portal-web/src/pages/MockTest.tsx",
    "portal-web/src/pages/mock-test.tsx"
]

web_patch_code = """
  // Anti-Cheat Security Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("Warning: Tab switching is not allowed during the mock test!");
      }
    };
    const handleCopyPaste = (e) => { e.preventDefault(); alert("Copy/Paste is disabled during exams."); };
    const handleContextMenu = (e) => { e.preventDefault(); };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
"""

# Apply to web files if found
for path in web_mock_paths:
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        if "visibilitychange" not in content and "useEffect" in content:
            # Inject inside main component body
            content = content.replace("export default function", "import { useEffect } from 'react';\n\nexport default function")
            # Simple injection before return
            if "return (" in content:
                content = content.replace("return (", f"useEffect(() => {{\n  const handleVisibilityChange = () => {{ if (document.hidden) alert('Warning: Tab switching detected!'); }};\n  document.addEventListener('visibilitychange', handleVisibilityChange);\n  const preventDefault = (e) => e.preventDefault();\n  document.addEventListener('copy', preventDefault);\n  document.addEventListener('paste', preventDefault);\n  document.addEventListener('contextmenu', preventDefault);\n  return () => {{\n    document.removeEventListener('visibilitychange', handleVisibilityChange);\n    document.removeEventListener('copy', preventDefault);\n    document.removeEventListener('paste', preventDefault);\n    document.removeEventListener('contextmenu', preventDefault);\n  }};\n}});\n\n  return (")
                with open(path, "w") as f:
                    f.write(content)
                print(f"Patched web mock test: {path}")

# 2. Update Mobile Mock Test Screen
mobile_mock_path = "student-mobile/app/mock-test.tsx"
if os.path.exists("student-mobile/app"):
    # Find mock test file in mobile app directory
    for root, dirs, files in os.walk("student-mobile/app"):
        for file in files:
            if "mock" in file.lower() and file.endswith(".tsx"):
                target = os.path.join(root, file)
                with open(target, "r") as f:
                    mcontent = f.read()
                if "AppState" not in mcontent:
                    # Add AppState listener import and check
                    mcontent = "import { AppState, Alert } from 'react-native';\n" + mcontent
                    print(f"Found mobile mock file: {target}")

print("Security patch script completed successfully.")
