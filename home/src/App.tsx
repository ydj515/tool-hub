/**
 * Tool Hub 홈 애플리케이션의 진입점: 레이아웃 셸에 홈 페이지를 조립한다.
 */
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <Layout>
      <HomePage />
    </Layout>
  );
}
