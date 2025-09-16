import { useEffect, type ReactNode } from 'react'; 
import { useInView } from 'react-intersection-observer'; 

interface InfiniteScrollProps {
  listItems: ReactNode[];
  lastRowHandler: () => void;
}

/**
 * A container component for infinite scrolling. 
 */
function InfiniteScroll({ listItems, lastRowHandler }: InfiniteScrollProps) {
    const [lastRowRef, lastRowInView] = useInView();

    // if last row is in view, call the last row handler
    useEffect(() => {
      if (lastRowInView) {
        lastRowHandler();
      }
    }, [lastRowInView]);

    const Elements = listItems.map((listItem, i) => {
        const props: React.HTMLAttributes<HTMLDivElement> = {};
        if (i === listItems.length - 1) {
          (props as any).ref = lastRowRef;
        }
        return (
          <div key={i} {...props}>
              {listItem}
          </div>
        );
    });
    return (<>{Elements}</>);
}

export default InfiniteScroll;