import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-bunty">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props as {
              className?: string;
              children: React.ReactNode;
              inline?: boolean;
            };
            const match = /language-(\w+)/.exec(className || "");
            const isInline = (props as { inline?: boolean }).inline;
            if (isInline || !match) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, background: "transparent", fontSize: "0.85em" }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
