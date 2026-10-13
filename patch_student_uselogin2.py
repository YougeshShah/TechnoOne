import pathlib

path = pathlib.Path("src/hooks/index.ts")
text = path.read_text()

old = """export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => setSession(data),
  });
}"""

new = """export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ rememberMe, ...credentials }: { email: string; password: string; rememberMe?: boolean }) =>
      authApi.login(credentials),
    onSuccess: (data, variables) => setSession({ ...data, rememberMe: variables.rememberMe }),
  });
}"""

count = text.count(old)
if count != 1:
    print(f"ERROR: anchor count = {count}. Aborting -- file may have changed since this patch was written.")
else:
    text = text.replace(old, new)
    path.write_text(text)
    print("Patched src/hooks/index.ts successfully.")
