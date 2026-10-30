import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { clearStoredSimpleAuthToken } from "@/lib/authSession";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import CalendarPage from "./pages/CalendarPage";
import WeeklyCalendarPage from "./pages/WeeklyCalendarPage";
import Finance from "./pages/Finance";
import Medications from "./pages/Medications";
import DiaryPage from "./pages/DiaryPage";
import { PrivacyPolicyPage, SupportPage } from "./pages/PublicLegalPages";

import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CalendarRange,
  DollarSign,
  Pill,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Book
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Etapa de integração: consulta e importação explícita de um mês do backup.
function FinancialSheetConnection() {
  const monthsQuery = trpc.financialMonths.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });
  const saveMonth = trpc.financialMonths.save.useMutation({ retry: false });
  const [backupText, setBackupText] = useState("");
  const [importMonth, setImportMonth] = useState("2026-11");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [importSucceeded, setImportSucceeded] = useState(false);

  async function importBackupMonth() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setImportSucceeded(false);

    try {
      if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(importMonth)) {
        throw new Error("Informe o mês no formato AAAA-MM, por exemplo 2026-11.");
      }
      if (new Blob([backupText]).size > 15_000_000) {
        throw new Error("Backup muito grande. O limite desta importação é 15 MB.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(backupText);
      } catch {
        throw new Error("O texto não é um JSON válido. Copie todo o conteúdo do Backup JSON.");
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Formato de backup inválido.");
      }
      const backup = parsed as { version?: unknown; months?: unknown };
      if (
        backup.version !== 2 ||
        !backup.months ||
        typeof backup.months !== "object" ||
        Array.isArray(backup.months)
      ) {
        throw new Error("Use o Backup JSON do painel financeiro desta conversa, versão 2.");
      }
      const months = backup.months as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(months, importMonth)) {
        throw new Error("O backup não contém o mês " + importMonth + ".");
      }
      const payload = months[importMonth];
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Os dados desse mês estão inválidos.");
      }

      // Confere a existência antes da importação; o banco também impede substituição.
      const latest = await monthsQuery.refetch();
      if (latest.isError || !latest.data) {
        throw new Error("Não foi possível conferir o banco. Nenhuma importação foi enviada.");
      }
      if (latest.data.some(row => row.month === importMonth)) {
        throw new Error("Esse mês já existe no servidor e não será substituído. O texto do backup foi preservado.");
      }
      if (!window.confirm("Importar somente " + importMonth + " para o servidor? Os outros meses não serão alterados.")) {
        return;
      }

      // A asserção fornece o tipo ao TypeScript; a API valida o conteúdo de fato.
      type SaveInput = Parameters<typeof saveMonth.mutateAsync>[0];
      await saveMonth.mutateAsync({
        month: importMonth,
        expectedVersion: 0,
        payload: payload as SaveInput["payload"],
      });

      setImportSucceeded(true);
      setMessage("Salvo no servidor: " + importMonth + ". Abra a mesma conta no outro dispositivo e clique em Verificar novamente.");
      await monthsQuery.refetch();
    } catch (error) {
      setMessage(
        (error instanceof Error ? error.message : "Não foi possível confirmar a importação.") +
        " O conteúdo colado foi mantido. Se houve falha de conexão, clique em Verificar novamente antes de tentar importar outra vez."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Planilha financeira</h1>
      <p className="text-muted-foreground">
        Histórico mensal PJ e PF — conexão e importação inicial.
      </p>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        {monthsQuery.isLoading ? (
          <p role="status">Consultando seus meses no servidor…</p>
        ) : monthsQuery.isError ? (
          <div role="alert" className="space-y-2">
            <p className="font-semibold text-red-600">Não foi possível consultar os meses.</p>
            <p className="break-words">{monthsQuery.error.message}</p>
          </div>
        ) : (
          <div role="status" className="space-y-2">
            <p className="font-semibold text-green-700">Consulta ao banco concluída com sucesso.</p>
            <p>Meses encontrados: {monthsQuery.data?.length ?? 0}</p>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={monthsQuery.isFetching || busy}
          onClick={() => { void monthsQuery.refetch(); }}
        >
          {monthsQuery.isFetching ? "Consultando…" : "Verificar novamente"}
        </Button>
        {!!monthsQuery.data?.length && (
          <ul className="list-disc pl-5 space-y-1">
            {monthsQuery.data.map(row => (
              <li key={String(row.month)}>
                {String(row.month)} — versão {String(row.version)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Importar um mês do painel desta conversa</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>No painel financeiro desta conversa, clique em Backup JSON e depois em Copiar JSON.</li>
          <li>Cole o conteúdo completo no campo abaixo. Não precisa baixar arquivo.</li>
          <li>Mantenha 2026-11 para importar novembro e clique em Importar mês.</li>
        </ol>
        <div className="space-y-2">
          <label htmlFor="financial-import-month" className="block text-sm font-medium">Mês a importar (AAAA-MM)</label>
          <input
            id="financial-import-month"
            type="text"
            maxLength={7}
            value={importMonth}
            disabled={busy}
            onChange={event => setImportMonth(event.target.value)}
            className="w-full max-w-xs rounded-md border bg-background p-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="financial-backup-json" className="block text-sm font-medium">Conteúdo completo do Backup JSON</label>
          <textarea
            id="financial-backup-json"
            rows={10}
            spellCheck={false}
            value={backupText}
            disabled={busy}
            onChange={event => setBackupText(event.target.value)}
            placeholder={'Cole aqui o JSON que começa com { e contém "version": 2 e "months".'}
            className="w-full rounded-md border bg-background p-3 font-mono text-xs"
          />
        </div>
        <Button
          type="button"
          disabled={busy || monthsQuery.isFetching || monthsQuery.isError || !monthsQuery.data || !backupText.trim()}
          onClick={() => { void importBackupMonth(); }}
        >
          {busy ? "Importando… Não feche esta página" : "Importar mês para o servidor"}
        </Button>
        {message && (
          <p role="status" className={`break-words text-sm ${importSucceeded ? "text-green-700" : "text-red-600"}`}>
            {message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          A importação cria somente o mês escolhido e não substitui um mês existente.
          Esta tela ainda não permite editar despesas; o painel completo será a próxima etapa.
          Os números importados ficam no banco, não nos arquivos do GitHub.
        </p>
      </div>
    </section>
  );
}

interface NavigationProps {
  userRole?: string;
  username?: string;
  userId?: number;
}

// Verifica se o usuário tem acesso restrito (role "trainer" vinda do banco)
function isRestrictedUser(userRole?: string, _username?: string): boolean {
  return userRole === "trainer";
}

function Navigation({ userRole, username, userId }: NavigationProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      clearStoredSimpleAuthToken();
      window.location.reload();
    },
    onError: () => {
      clearStoredSimpleAuthToken();
      window.location.reload();
    },
  });

  // Define navigation items based on user role
  // excludeUsernames: lista de usernames que NÃO devem ver este item
  const allNavItems = [
    { path: "/", label: "Mensal", icon: CalendarDays, roles: ["admin", "trainer", "user"] },
    { path: "/agenda", label: "Semanal", icon: CalendarRange, roles: ["admin", "trainer", "user"] },
    { path: "/eventos", label: "Escala", icon: Calendar, roles: ["admin"] },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { path: "/diario", label: "Diário", icon: Book, roles: ["admin", "user"] },
    { path: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"] },
    { path: "/planilha-financeira", label: "Planilha financeira", icon: DollarSign, roles: ["admin"] },
    // { path: "/medicamentos", label: "Medicamentos", icon: Pill, roles: ["admin", "user"] }, // OCULTO
  ];

  const navItems = allNavItems.filter(item => {
    // Filtrar por role — sem hardcode de usernames
    if (!item.roles.includes(userRole || "")) return false;
    return true;
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r h-screen fixed left-0 top-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Meus Plantões
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {username ? `Olá, ${username}` : "2026"}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[calc(4rem+max(env(safe-area-inset-top,0px),48px))] bg-card border-b z-50 flex items-center justify-between px-4" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Meus Plantões
          </h1>
          {username && (
            <p className="text-[10px] text-muted-foreground">Olá, {username}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 top-[calc(4rem+max(env(safe-area-inset-top,0px),48px))] bg-background z-40">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mt-4"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex items-start justify-around px-2 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)', height: 'calc(4rem + max(env(safe-area-inset-bottom, 0px), 8px))' }}>
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

interface AuthenticatedAppProps {
  userRole?: string;
  username?: string;
  userId?: number;
}

function AuthenticatedApp({ userRole, username, userId }: AuthenticatedAppProps) {
  const [location, setLocation] = useLocation();

  // Redirecionar trainers para /agenda em rotas sensíveis
  useEffect(() => {
    if (isRestrictedUser(userRole, username)) {
      // Bloquear acesso a rotas sensíveis
      const restrictedPaths = ["/eventos", "/dashboard", "/financeiro", "/planilha-financeira", "/workplaces", "/medicamentos", "/diario"];
      if (restrictedPaths.includes(location)) {
        setLocation("/agenda");
      }
    }
  }, [userRole, username, location, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userRole} username={username} userId={userId} />
      <main className="lg:ml-64 lg:pt-0 lg:pb-0" style={{ paddingTop: 'calc(4rem + max(env(safe-area-inset-top, 0px), 48px))', paddingBottom: 'calc(5rem + max(env(safe-area-inset-bottom, 0px), 8px))' }}>
        <div className="w-full px-4 py-4 lg:px-8 max-w-[1920px] mx-auto">
          <Switch>
            {/* Rota do calendário mensal - acessível a todos */}
            <Route path="/" component={CalendarPage} />
            {/* Rotas exclusivas para admin */}
            {userRole === "admin" && (
              <>
                <Route path="/eventos" component={Events} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/planilha-financeira" component={FinancialSheetConnection} />
              </>
            )}
            {/* Rotas para todos os usuários logados (exceto trainers e usuários restritos) */}
            {(userRole === "admin" || userRole === "user") && (
              <>
                <Route path="/financeiro" component={Finance} />
                <Route path="/medicamentos" component={Medications} />
                <Route path="/diario" component={DiaryPage} />
              </>
            )}
            {/* Rota do calendário semanal - acessível a todos */}
            <Route path="/agenda" component={WeeklyCalendarPage} />
            {/* Fallback */}
            <Route>
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Página não encontrada</h1>
                <Link
                  href={isRestrictedUser(userRole, username) ? "/agenda" : "/"}
                  className="text-primary hover:underline mt-4 inline-block"
                >
                  Voltar ao início
                </Link>
              </div>
            </Route>
          </Switch>
        </div>
      </main>
    </div>
  );
}

interface AuthenticatedUserInfo {
  username?: string;
  role?: string;
  userId?: number;
}

function AppContent() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const { data: authData, isLoading, refetch } = trpc.auth.checkSimpleAuth.useQuery();

  useEffect(() => {
    if (isLoading || !authData) return;

    if (authData.isAuthenticated) {
      setIsAuthenticated(true);
      setUserInfo(authData.user);
      return;
    }

    // Evita que uma checagem tardia/pós-login com cookie ausente derrube a entrada
    // que acabou de ser confirmada pela mutação de login.
    if (isAuthenticated !== true) {
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  }, [authData, isAuthenticated, isLoading]);

  if (location === "/privacy") {
    return <PrivacyPolicyPage />;
  }

  if (location === "/support") {
    return <SupportPage />;
  }

  const handleLoginSuccess = (loginUserInfo: AuthenticatedUserInfo) => {
    // No iOS/TestFlight, a checagem imediatamente após o login pode ficar pendente.
    // Como o login já foi validado pelo backend, entramos no app com os dados retornados
    // pela própria mutação e apenas atualizamos a sessão em segundo plano.
    setIsAuthenticated(true);
    setUserInfo(loginUserInfo);

    refetch()
      .then(result => {
        if (result.data?.isAuthenticated) {
          setUserInfo(result.data.user);
        }
      })
      .catch(error => {
        console.warn("[Auth] Background session refresh failed after login:", error);
      });
  };

  if (isAuthenticated === null && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <AuthenticatedApp userRole={userInfo?.role} username={userInfo?.username} userId={userInfo?.userId} />;
}

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(console.error);
      StatusBar.setStyle({ style: Style.Default }).catch(console.error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
