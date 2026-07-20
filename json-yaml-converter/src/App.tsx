import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout header={<Header theme={theme} onToggleTheme={toggle} />}>
      <main className="app-main" aria-label="변환기 작업 공간" />
    </Layout>
  );
}
