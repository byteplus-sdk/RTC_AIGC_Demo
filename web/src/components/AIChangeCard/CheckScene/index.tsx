import CheckedSVG from '@/assets/img/Checked.svg';
import styles from './index.module.less';

interface IProps {
  checked: boolean;
  title?: string;
  onClick?: () => void;
  icon?: string;
  tag?: string;
}

function CheckScene(props: IProps) {
  const { tag, icon, title, checked, onClick } = props;
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={`${styles.wrapper} ${checked ? styles.active : ''}`}
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

export default CheckScene;
