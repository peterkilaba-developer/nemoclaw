import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './LegalPage.css';
import './BlogPost.css';

import qnaData from '../data/qna_seed.json';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function QnADirectory() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQnA() {
      try {
        const qSnap = await getDocs(query(collection(db, '_publicQnA'), orderBy('createdAt', 'desc')));
        const liveQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Merge with local seed data, avoiding duplicates
        const liveIds = new Set(liveQuestions.map(q => q.id));
        const missingSeeds = qnaData.filter(seed => !liveIds.has(seed.id));
        
        setQuestions([...liveQuestions, ...missingSeeds]);
      } catch (err) {
        console.error('Failed to fetch Q&A:', err);
        setQuestions(qnaData); // fallback to seed if firestore fails
      } finally {
        setLoading(false);
      }
    }
    fetchQnA();
  }, []);

  return (
    <>
      <Navbar />
      <SEO
        title="Knowledge Base / Answers"
        path="/answers"
        description="NemoC LAW AI Knowledge Base — Authoritative answers on Agentic Workflows, HITL Compliance, and Legal AI Infrastructure."
      />
      <main className="legal-page">
        <div className="container">
          <header className="blog-index-header">
            <h1>Knowledge <span style={{color: "var(--primary)"}}>Base</span></h1>
            <p>Authoritative answers on Agentic Workflows, HITL Compliance, and Legal AI Infrastructure.</p>
          </header>

          {loading ? (
            <div className="skeleton-loader" style={{height: 100, width: '100%', borderRadius: 8}}></div>
          ) : questions.length === 0 ? (
            <section>
              <br/>
              <p>No questions found right now. Check back soon!</p>
            </section>
          ) : (
            <div className="blog-grid" style={{ gridTemplateColumns: "1fr", gap: "1.5rem" }}>
              {questions.map((q) => (
                <Link
                  key={q.slug || q.id}
                  to={`/answers/${q.slug || q.id}`}
                  className="blog-card"
                >
                  <div className="blog-card-content">
                    <div className="blog-card-meta">
                      <span className="blog-card-tag" style={{ border: '1px solid var(--border)' }}>{q.category || 'Architecture'}</span>
                    </div>
                    <h2>{q.question}</h2>
                    <div className="blog-card-footer" style={{ marginTop: '1rem', color: "var(--primary)" }}>
                      Read Expert Answer →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
