/**
 * 홈 하단 푸터: 저작권 표기와 GitHub 링크.
 */
import { GITHUB_REPO } from '../../constants';

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.07] dark:border-white/[0.06] py-5 px-6">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between">
        <p className="text-[12px] text-gray-400 dark:text-white/25">
          Built with React &amp; Tailwind CSS
        </p>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-gray-400 dark:text-white/25 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
