import React from 'react';

function Navbar() {
  return (
    <nav style={styles.navbar}>
      <div style={styles.logo}>LIFELEADGER</div>
    </nav>
  );
}

const styles = {
  navbar: {
    backgroundColor: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'fixed',
    width: '100%',
    top: 0,
    zIndex: 1000
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'left'
  }
};

export default Navbar;