import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { StepNavigator } from './components/layout/StepNavigator';
import { useTheme } from './hooks/useTheme';

function App() {
  const { theme, toggle } = useTheme();

  return (
    <AppShell>
      <Header theme={theme} onToggleTheme={toggle} />
      <StepNavigator current="input" />
      <main className="welcome-panel">
        <p className="eyebrow">브라우저 전용 계약 테스트 설계</p>
        <h2>OpenAPI 명세에서 검토 가능한 테스트 계획을 만드세요.</h2>
        <p>정상 요청을 기준으로 제약 조건 하나만 바꾼 테스트를 생성합니다.</p>
      </main>
    </AppShell>
  );
}

export default App;
