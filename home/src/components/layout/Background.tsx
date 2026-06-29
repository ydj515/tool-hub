/**
 * 다크 모드 전용 배경 레이어(그리드 + 블러 오브).
 * aria-hidden과 pointer-events-none으로 접근성·클릭 동작에 영향을 주지 않는다.
 */
export default function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="dark-grid absolute inset-0 opacity-0 dark:opacity-100" />
      <div className="orb-a orb-bg-a absolute -top-[15%] -left-[5%] w-[65vw] h-[65vw] max-w-[680px] max-h-[680px] rounded-full blur-[130px] opacity-0 dark:opacity-[0.08]" />
      <div className="orb-b orb-bg-b absolute top-[5%] right-[-8%] w-[55vw] h-[55vw] max-w-[560px] max-h-[560px] rounded-full blur-[110px] opacity-0 dark:opacity-[0.055]" />
      <div className="orb-c orb-bg-c absolute bottom-[-8%] left-[25%] w-[50vw] h-[50vw] max-w-[520px] max-h-[520px] rounded-full blur-[100px] opacity-0 dark:opacity-[0.045]" />
    </div>
  );
}
