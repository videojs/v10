import styles from './button.styles';

export function ConditionalComponent({ icon }: { icon: boolean }) {
  return <button type="button" className={[styles.root, icon ? styles.icon : undefined]} />;
}
