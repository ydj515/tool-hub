import { lazy, Suspense } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { StepNavigator } from './components/layout/StepNavigator';
import { useTheme } from './hooks/useTheme';
import { useTestWorkspace } from './hooks/useTestWorkspace';

const GeneratorPage = lazy(() => import('./pages/GeneratorPage'));

function App() {
  const { theme, toggle } = useTheme();
  const controller = useTestWorkspace();

  return (
    <AppShell>
      <Header theme={theme} onToggleTheme={toggle} />
      <StepNavigator current={controller.state.step} />
      <main>
        <Suspense fallback={<div className="welcome-panel" role="status">도구를 준비하고 있습니다.</div>}>
          <GeneratorPage controller={controller} theme={theme} />
        </Suspense>
      </main>
    </AppShell>
  );
}

export default App;
