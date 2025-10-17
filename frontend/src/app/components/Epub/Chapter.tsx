import React, { useEffect }from "react";

export function ChapterItem({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const imgs = ref.current.querySelectorAll('img');
    imgs.forEach(img => {
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
    });
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
