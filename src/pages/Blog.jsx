import { useEffect, useState } from 'react';
import { getPublishedPosts } from '../lib/contentService';
import './LegalPage.css';
import './BlogPost.css';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      const liveData = await getPublishedPosts();
      setPosts(liveData);
      setLoading(false);
    }
    loadPosts();
  }, []);

  return (
    <>
      <Navbar />
      <SEO
        title="Blog & Insights"
        path="/blog"
        description="NemoC LAW AI blog — insights on legal AI strategy, data privacy for law firms, agentic AI workflows, and the future of AI-powered legal practice."
      />
      <main className="legal-page">
        <div className="container">
          <header className="blog-index-header" style={{ marginBottom: '2rem' }}>
            <h1>Blog & <span style={{color: "var(--primary)"}}>Insights</span></h1>
            <p>Authoritative perspectives on Agentic workflows, legal scaling, and ethical AI integration.</p>
          </header>

          {loading ? (
            <div className="skeleton-loader" style={{height: 100, width: '100%', borderRadius: 8}}></div>
          ) : posts.length === 0 ? (
            <section>
              <br/>
              <p>No blog posts found right now. Check back soon!</p>
            </section>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug || post.id}`}
                  className="blog-card"
                >
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} className="blog-card-image" style={{ width: '100%', height: '200px', objectFit: 'cover', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }} />
                  )}
                  <div className="blog-card-content">
                    <div className="blog-card-meta">
                      <span className="blog-card-tag">{post.category || 'Strategy'}</span>
                      <span className="dot">•</span>
                      <span className="blog-card-date">{post.publishedAt ? new Date(post.publishedAt.toMillis()).toLocaleDateString() : ''}</span>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.description}</p>
                    <div className="blog-card-footer" style={{ marginTop: '1rem', color: "var(--primary)" }}>
                      Read Article →
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
