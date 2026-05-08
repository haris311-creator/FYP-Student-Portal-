import React, { useEffect, useRef } from 'react';
import Navbar from '../Components/Navbar';
import Footer from '../Components/Footer';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { committeeMembers, activities } from '../Data/Ddata';
import AnnouncementTicker from '../Components/AnnouncementTicker';
import './Homepage.css';

function HomePage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 80;

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const count = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const spread = 120;

    for (let i = 0; i < count; i++) {
      positions.push(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x3b82f6, size: 0.8 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

   
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.25 });
    const posArr = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = posArr[i*3] - posArr[j*3];
        const dy = posArr[i*3+1] - posArr[j*3+1];
        const dz = posArr[i*3+2] - posArr[j*3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 25) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(posArr[i*3], posArr[i*3+1], posArr[i*3+2]),
            new THREE.Vector3(posArr[j*3], posArr[j*3+1], posArr[j*3+2])
          ]);
          scene.add(new THREE.Line(lineGeo, lineMaterial));
        }
      }
    }

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      points.rotation.y += 0.0015;
      points.rotation.x += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
      <div className="home-container">

      <section className="hero-section">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-content">
          <p className="hero-eyebrow">Iqra University — FEST</p>
          <h1 className="hero-title">
           Final Year Design Project<br />
            <span>Management Portal</span>
          </h1>
          <p className="hero-subtitle">
            Automated submissions, real-time tracking, <br />
           and seamless collaboration for your FYP.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="hero-btn-primary">Get Started</Link>
            <a href="#committee" className="hero-btn-secondary">Meet the Committee</a>
          </div>
        </div>
      </section>

      <AnnouncementTicker />
   
      <section className="home-section" id="committee">
        <div className="section-header">
          <p className="section-tag">Our Team</p>
          <h2 className="section-title">FYDP Committee Members</h2>
          <p className="section-subtitle">Meet the dedicated team working to streamline your final year projects.</p>
        </div>
        <div className="committee-grid">
          {committeeMembers.map(member => (
            <div key={member.id} className="committee-card">
              <div className="member-image-container">
                <img src={member.image} alt={member.name} className="member-image" />
              </div>
              <h3 className="member-name">{member.name}</h3>
              <p className="member-designation">{member.title}</p>
              <span className="member-role">{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      <section className="home-section">
        <div className="section-header">
          <p className="section-tag">Gallery</p>
          <h2 className="section-title">FYP Activities</h2>
          <p className="section-subtitle">Glimpses of past events, evaluations, and project showcases.</p>
        </div>
        <div className="activity-grid">
          {activities.map(activity => (
            <div key={activity.id} className="activity-card">
              <div className="activity-image-wrapper">
                <img src={activity.image} alt={activity.title} className="activity-image" />
              </div>
              <div className="activity-content">
                <h3 className="activity-title">{activity.title}</h3>
                <p className="activity-desc">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default HomePage;