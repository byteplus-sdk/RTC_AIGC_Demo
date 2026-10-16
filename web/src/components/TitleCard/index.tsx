import styles from './index.module.less';

interface ITitleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  required?: boolean;
  titleClassName?: string;
  size?: 'default' | 'mini';
}

function TitleCard(props: ITitleCardProps) {
  const { required, title, children, className, titleClassName, size = 'default', ...rest } = props;
  return (
    <div
      className={`${styles.wrapper} ${size === 'mini' ? styles.mini : ''} ${className}`}
      {...rest}
    >
      <div className={`${styles.title} ${titleClassName}`}>
        {required ? <div className={styles.required}>* </div> : ''}
        {title}
      </div>
      <div className={styles.children}>{children}</div>
    </div>
  );
}
export default TitleCard;
