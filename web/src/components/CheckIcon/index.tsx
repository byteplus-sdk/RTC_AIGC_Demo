import CheckedSVG from '@/assets/img/Checked.svg';
import styles from './index.module.less';

interface IProps {
  mode?: 'horizontal' | 'vertical';
  className?: string;
  blur?: boolean;
  checked: boolean;
  title?: string;
  onClick?: () => void;
  icon?: string;
  tag?: string;
}

function CheckIcon(props: IProps) {
  const { mode = 'vertical', tag, blur, className = '', icon, title, checked, onClick } = props;
  const wrapperStyle = blur && mode === 'vertical' ? styles.blur : styles.wrapper;
  const isHorizontal = mode === 'horizontal';

  return (
    <button
      type="button"
      aria-pressed={checked}
      className={[
        checked ? styles.active : wrapperStyle,
        isHorizontal ? styles.horizontal : '',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {tag ? <div className={styles.tag}>{tag}</div> : ''}
      <div className={styles.content}>
        {icon ? <img className={styles.icon} src={icon} alt="icon" /> : ''}
        <div className={styles['checked-text']}>{title}</div>
      </div>
      {checked ? <img className={styles.checkIcon} src={CheckedSVG} alt="checked" /> : ''}
    </button>
  );
}

export default CheckIcon;
