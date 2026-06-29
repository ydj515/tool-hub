/**
 * Sign Maker 애플리케이션 진입점: 레이아웃 셸에 페이지를 조립한다.
 */
import Layout from "./components/layout/Layout";
import SignMakerPage from "./pages/SignMakerPage";

export default function App() {
  return (
    <Layout>
      <SignMakerPage />
    </Layout>
  );
}
