import { lazy, Suspense } from 'react';
import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

const ConverterPage = lazy(() => import('./pages/ConverterPage'));

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout header={<Header theme={theme} onToggleTheme={toggle} />}>
      <Suspense fallback={<main className="app-main" role="status">변환기를 불러오는 중입니다.</main>}>
        <ConverterPage theme={theme} />
      </Suspense>
    </Layout>
  );
}
