import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../css/main.css';
import Header from '../components/Header';
import DemoModal from '../components/DemoModal';

function DocsHeader() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <>
      <Header onOpenDemo={() => setDemoOpen(true)} />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

render(<DocsHeader />, document.getElementById('header-mount'));
