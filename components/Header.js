import styles from "../styles/index.module.css"; 

export default function Header() {
    return (
      <nav className={styles.headerContainer}>
        <h1 className={styles.headerTitle}>Decentralized Storage</h1>
      </nav>
    );
  }
  