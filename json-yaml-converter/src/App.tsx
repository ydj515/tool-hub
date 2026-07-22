import { lazy, Suspense } from 'react';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

const ConverterPage = lazy(() => import('./pages/ConverterPage'));

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout>
      <Suspense fallback={<main role="status">변환기를 불러오는 중입니다.</main>}>
        <ConverterPage theme={theme} onToggleTheme={toggle} />
      </Suspense>
    </Layout>
  );
}
