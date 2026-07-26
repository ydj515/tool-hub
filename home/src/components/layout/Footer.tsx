/**
 * 홈 하단 푸터: 저작권 표기와 GitHub 링크.
 */
import { GITHUB_REPO } from '../../constants';

export default function Footer() {
  return (
    <footer className="border-t border-line py-5">
      <div className="ds-shell flex items-center justify-between">
        <p className="text-caption text-muted">
          Built with React &amp; Tailwind CSS
        </p>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption text-muted hover:text-primary-text transition-colors no-underline"
        >
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
