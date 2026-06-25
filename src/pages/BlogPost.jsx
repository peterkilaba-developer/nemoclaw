import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPostBySlug } from '../lib/contentService';
import './LegalPage.css';
import './BlogPost.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      const data = await getPostBySlug(slug);
      setPost(data);
      setLoading(false);
    }
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="legal-page blog-post">
          <div className="container">
            <div className="skeleton-loader" style={{height: 40, width: '60%', marginBottom: 20}}></div>
            <div className="skeleton-loader" style={{height: 20, width: '100%', marginBottom: 10}}></div>
            <div className="skeleton-loader" style={{height: 20, width: '90%', marginBottom: 10}}></div>
            <div className="skeleton-loader" style={{height: 20, width: '95%', marginBottom: 40}}></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <main className="legal-page blog-post">
          <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
            <h1>Post Not Found</h1>
            <p>The post you are looking for does not exist or has been removed.</p>
            <Link to="/blog" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-block' }}>Back to Blog</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Determine if it has JSON-LD explicitly in the markdown to strip it
  let cleanContent = post.content || '';
  const jsonLdMatch = cleanContent.match(/```json\n([\s\S]*?"@context": "https:\/\/schema\.org"[\s\S]*?)\n```/);
  let schemaData = null;
  if (jsonLdMatch) {
     cleanContent = cleanContent.replace(jsonLdMatch[0], ''); // Remove from render
     try {
       schemaData = JSON.parse(jsonLdMatch[1]);
     } catch (e) {
       console.error("Failed to parse JSON-LD from markdown", e);
     }
  }

  return (
    <>
      <Navbar />
      <SEO 
        title={post.title} 
        description={post.description} 
        path={`/blog/${slug}`}
      >
         {schemaData && (
           <script type="application/ld+json">
             {JSON.stringify(schemaData)}
           </script>
         )}
      </SEO>
      <main className="legal-page blog-post">
        <article className="container">
          <header className="blog-header">
            <Link to="/blog" className="back-link">← Back to Blog</Link>
            <h1>{post.title}</h1>
            <div className="blog-meta">
              <span>{post.author}</span>
              <span className="dot">•</span>
              <span>{post.publishedAt ? new Date(post.publishedAt.toMillis()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="blog-tags">
                {post.tag.map(tag => (
                  <span key={tag} className="blog-tag">{tag}</span>
                ))}
              </div>
            )}
          </header>
          <div className="content">
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
