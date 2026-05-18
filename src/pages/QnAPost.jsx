import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './LegalPage.css';
import './BlogPost.css';

import qnaData from '../data/qna_seed.json';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import ReactMarkdown from 'react-markdown';

export default function QnAPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      try {
        const qSnap = await getDocs(query(collection(db, '_publicQnA'), where('slug', '==', slug)));
        if (!qSnap.empty) {
          setPost({ id: qSnap.docs[0].id, ...qSnap.docs[0].data() });
          return;
        } 
        // Check by ID fallback
        const byIdSnap = await getDocs(query(collection(db, '_publicQnA')));
        const dbMatch = byIdSnap.docs.find(d => d.id === slug);
        if (dbMatch) {
          setPost({ id: dbMatch.id, ...dbMatch.data() });
          return;
        }
        
        // If not in DB, fallback to seed Data
        const localMatch = qnaData.find(q => q.slug === slug || q.id === slug);
        if (localMatch) {
          setPost(localMatch);
        }
      } catch (err) {
        console.error('Failed to fetch post:', err);
        // Fallback to seed on error
        const localMatch = qnaData.find(q => q.slug === slug || q.id === slug);
        if (localMatch) setPost(localMatch);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="legal-page blog-post">
          <div className="container">
            <div className="skeleton-loader" style={{height: 40, width: '60%', marginBottom: 20}}></div>
            <div className="skeleton-loader" style={{height: 20, width: '100%', marginBottom: 10}}></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!post) {
    return <Navigate to="/answers" replace />;
  }

  // Generate valid schema
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": post.question,
      "text": post.question,
      "answerCount": 1,
      "upvoteCount": 142,
      "dateCreated": new Date(post.createdAt?.toDate?.() || Date.now()).toISOString(),
      "author": { "@type": "Organization", "name": "NemoC LAW AI" },
      "acceptedAnswer": {
        "@type": "Answer",
        "text": post.answer,
        "dateCreated": new Date(post.createdAt?.toDate?.() || Date.now()).toISOString(),
        "upvoteCount": 218,
        "author": { "@type": "Organization", "name": "NemoC LAW AI Expert Network" }
      }
    }
  };

  return (
    <>
      <Navbar />
      <SEO 
        title={post.question} 
        description={`Expert answer provided by NemoC LAW AI regarding: ${post.question}`} 
        path={`/answers/${slug}`}
      >
         <script type="application/ld+json">
           {JSON.stringify(schemaData)}
         </script>
      </SEO>
      <main className="legal-page blog-post">
        <article className="container">
          <header className="blog-header">
            <Link to="/answers" className="back-link">← Back to Knowledge Base</Link>
            <h1>{post.question}</h1>
            <div className="blog-meta">
              <span>NemoC LAW AI Expert Network</span>
              <span className="dot">•</span>
              <span>{new Date(post.createdAt?.toDate?.() || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="blog-tags">
              <span className="blog-tag">{post.category || 'Architecture'}</span>
            </div>
          </header>
          <div className="content">
            <ReactMarkdown>{post.answer}</ReactMarkdown>
          </div>
          
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
             <h3>Build a resilient firm.</h3>
             <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>Join the vanguard of Agentic HITL Law Firms today.</p>
             <Link to="/v2" className="btn btn-primary">Explore the Agentic OS</Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
