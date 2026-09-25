import type { Tool } from '../data/tools';

interface ToolCardProps {
  tool: Tool;
  description: string;
  eager?: boolean;
}

export default function ToolCard({ tool, description, eager = false }: ToolCardProps) {
  const isLive = tool.status === 'live' && Boolean(tool.url);
  return (
    <article className="toolCard" data-tool-id={tool.id} data-live={isLive}>
      <div className="toolPreview" aria-hidden="true">
        <img src={`/images/previews/${tool.id}.webp`} alt="" width="720" height="400" loading={eager ? 'eager' : 'lazy'} />
        {!isLive && <span className="toolStatus">준비 중</span>}
      </div>
      <div className="toolCardContent">
        <div className="toolCardHeading">
          <h2>{tool.name}</h2>
          {isLive ? (
            <a className="toolOpen" href={tool.url!} target="_blank" rel="noopener noreferrer" aria-label={`${tool.name} 열기 (새 탭)`}>
              열기 <span aria-hidden="true">↗</span>
            </a>
          ) : <span className="toolUnavailable">준비 중</span>}
        </div>
        <p>{description}</p>
        <a className="toolSource" href={tool.github} target="_blank" rel="noopener noreferrer" aria-label={`${tool.name} 소스 코드 (새 탭)`}>소스 코드</a>
      </div>
    </article>
  );
}
