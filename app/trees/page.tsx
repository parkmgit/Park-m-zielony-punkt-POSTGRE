'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, MapPin, Calendar, User, Building, X, Download, FileText, Edit, Trash2, TreePine } from 'lucide-react';
import { Tree } from '@/lib/types';

interface Project {
  id: number;
  project_number: string;
  name: string;
  location?: string;
  client?: string;
  trees_to_plant: number;
  trees_planted: number;
}

// Component for displaying tree actions
function TreeActions({ treeId }: { treeId: number }) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trees/${treeId}/actions`)
      .then(res => res.json())
      .then(data => {
        setActions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading actions:', err);
        setLoading(false);
      });
  }, [treeId]);

  if (loading) {
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500">
        Ładowanie akcji...
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500">
        Brak akcji dla tego drzewa
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 space-y-2">
      {actions.map((action, index) => (
        <div key={action.id || index} className="flex items-start gap-3 text-sm">
          <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-500"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800 dark:text-white">{action.action_type}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400">{new Date(action.performed_at).toLocaleDateString('pl-PL')}</span>
            </div>
            {action.performer_name && (
              <div className="text-gray-600 dark:text-gray-400">Wykonawca: {action.performer_name}</div>
            )}
            {action.notes && (
              <div className="text-gray-600 dark:text-gray-400 italic">{action.notes}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TreesPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [treePhotos, setTreePhotos] = useState<string[]>([]);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [photoSrc, setPhotoSrc] = useState<string>('');
  const [photoFallbackStep, setPhotoFallbackStep] = useState<0 | 1 | 2>(0);
  const [treeActions, setTreeActions] = useState<any[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [photoModalLoading, setPhotoModalLoading] = useState(false);
  const [expandedTreeId, setExpandedTreeId] = useState<number | null>(null);

  const toCloudinaryDisplayUrl = (url: string) => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

    const withImageUpload = url
      .replace('/raw/upload/', '/image/upload/')
      .replace('/video/upload/', '/image/upload/');

    // Prefer modern format conversion
    return withImageUpload.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
  };

  const openTreeDrawer = async (tree: Tree) => {
    setSelectedTree(tree);
    setIsDrawerOpen(true);
    setPhotoLoadError(false);
    setPhotoSrc('');
    setPhotoFallbackStep(0);
    
    // Fetch photos and actions for this tree
    try {
      const [photosRes, actionsRes] = await Promise.all([
        fetch(`/api/photos?entity_type=tree&entity_id=${tree.id}`),
        fetch(`/api/trees/${tree.id}/actions`)
      ]);
      const photos = await photosRes.json();
      const actions = await actionsRes.json();
      const urls = photos
        .map((p: any) => (typeof p?.url === 'string' ? p.url.trim() : ''))
        .filter((url: string) => Boolean(url) && /^https?:\/\//i.test(url));

      console.log('Tree photo URLs:', { treeId: tree.id, urls });

      setTreePhotos(urls);
      setPhotoSrc(urls[0] || '');
      setTreeActions(actions);
    } catch (error) {
      console.error('Error fetching tree data:', error);
      setTreePhotos([]);
      setPhotoSrc('');
      setTreeActions([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [treesRes, projectsRes] = await Promise.all([
        fetch('/api/trees'),
        fetch('/api/projects')
      ]);
      const treesData = await treesRes.json();
      const projectsData = await projectsRes.json();
      setTrees(treesData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTree = async (treeId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć to drzewo? Ta operacja jest nieodwracalna.')) {
      return;
    }

    try {
      const response = await fetch(`/api/trees/${treeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Drzewo zostało usunięte');
        setIsDrawerOpen(false);
        fetchData(); // Odśwież listę
      } else {
        const error = await response.json();
        alert('Błąd usuwania drzewa: ' + error.error);
      }
    } catch (error) {
      console.error('Error deleting tree:', error);
      alert('Błąd usuwania drzewa');
    }
  };

  const filteredTrees = trees.filter(tree => {
    const matchesSearch = 
      tree.species_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.site_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || tree.status === filterStatus;
    const matchesProject = !filterProject || tree.project_id?.toString() === filterProject;
    const matchesDateFrom = !filterDateFrom || new Date(tree.plant_date) >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || new Date(tree.plant_date) <= new Date(filterDateTo);
    
    return matchesSearch && matchesStatus && matchesProject && matchesDateFrom && matchesDateTo;
  });

  // Get selected project stats
  const selectedProjectTrees = filterProject ? trees.filter(t => t.project_id?.toString() === filterProject) : trees;
  const projectStats = {
    total: selectedProjectTrees.length,
    posadzone: selectedProjectTrees.filter(t => t.status === 'posadzone').length,
    utrzymanie: selectedProjectTrees.filter(t => t.status === 'utrzymanie').length,
    wymiana: selectedProjectTrees.filter(t => t.status === 'wymiana').length,
    usuniete: selectedProjectTrees.filter(t => t.status === 'usuniete').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posadzone': return 'bg-green-100 text-green-800';
      case 'utrzymanie': return 'bg-blue-100 text-blue-800';
      case 'wymiana': return 'bg-yellow-100 text-yellow-800';
      case 'usuniete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const printHTML = (html: string) => {
    let container = document.getElementById('print-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'print-container';
      document.body.appendChild(container);
    }
    container.innerHTML = html;
    setTimeout(() => {
      window.print();
      setTimeout(() => { if (container) container.innerHTML = ''; }, 1000);
    }, 300);
  };

  const exportTreeToPDF = () => {
    if (!selectedTree) return;
    const project = projects.find(p => p.id === selectedTree.project_id);
    const photoHTML = treePhotos.length > 0
      ? `<img src="${treePhotos[0]}" style="max-width:100%;height:auto;margin-bottom:20px;border-radius:8px;" />`
      : '<div style="background:#f0f0f0;padding:30px;text-align:center;margin-bottom:20px;border-radius:8px;color:#666;">Brak zdjęcia</div>';
    const s = (v: string | undefined | null) => v || '-';
    printHTML(`
      <h1 style="color:#22c55e;margin-bottom:4px;">Raport Drzewa #${s(selectedTree.tree_number)}</h1>
      <p style="color:#666;font-size:13px;">Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
      ${photoHTML}
      <div style="margin:16px 0;padding:14px;background:#f9f9f9;border-radius:8px;">
        <h2 style="margin:0 0 10px;">Informacje podstawowe</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="font-weight:bold;padding:4px 8px;width:160px;">Numer drzewa:</td><td style="padding:4px 8px;">${s(selectedTree.tree_number)}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">Gatunek:</td><td style="padding:4px 8px;">${s(selectedTree.species_name)}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">Status:</td><td style="padding:4px 8px;">${selectedTree.status}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">Data:</td><td style="padding:4px 8px;">${new Date(selectedTree.plant_date).toLocaleDateString('pl-PL')}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">Wykonawca:</td><td style="padding:4px 8px;">${s(selectedTree.worker_name)}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">Projekt:</td><td style="padding:4px 8px;">${s(selectedTree.site_code)} — ${s(selectedTree.site_name)}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 8px;">GPS:</td><td style="padding:4px 8px;">${selectedTree.latitude.toFixed(6)}, ${selectedTree.longitude.toFixed(6)}</td></tr>
          ${selectedTree.notes ? `<tr><td style="font-weight:bold;padding:4px 8px;">Notatki:</td><td style="padding:4px 8px;">${selectedTree.notes}</td></tr>` : ''}
        </table>
      </div>
      ${treeActions.length > 0 ? `
      <div style="margin:16px 0;padding:14px;background:#f9f9f9;border-radius:8px;">
        <h2 style="margin:0 0 10px;">Historia akcji (${treeActions.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#e5e7eb;">
            <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Data</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Typ akcji</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Wykonawca</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Notatki</th>
          </tr></thead>
          <tbody>
            ${treeActions.map(a => `<tr>
              <td style="padding:5px 8px;border:1px solid #d1d5db;">${new Date(a.performed_at).toLocaleDateString('pl-PL')}</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;">${a.action_type}</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;">${a.performer_name || '-'}</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;">${a.notes || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `);
  };

  const exportAllTreesToPDF = () => {
    const projectName = filterProject
      ? projects.find(p => p.id.toString() === filterProject)?.name || 'Projekt'
      : 'Wszystkie projekty';

    const statusColors: Record<string, string> = {
      posadzone: 'background:#d1fae5;color:#065f46;',
      utrzymanie: 'background:#dbeafe;color:#1e40af;',
      wymiana: 'background:#fef3c7;color:#92400e;',
      usuniete: 'background:#fee2e2;color:#991b1b;',
    };

    const rows = filteredTrees.map((tree, i) => {
      const sc = statusColors[tree.status] || 'background:#f3f4f6;color:#374151;';
      const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      return `
      <tr style="background:${bg};">
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111;">${tree.tree_number || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#374151;">${tree.species_name || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:11px;">${tree.site_code}<br/><span style="color:#6b7280;">${tree.site_name}</span></td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#374151;white-space:nowrap;">${new Date(tree.plant_date).toLocaleDateString('pl-PL')}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#374151;">${tree.worker_name || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;"><span style="padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;${sc}">${tree.status}</span></td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:10px;white-space:nowrap;">${tree.latitude.toFixed(5)}<br/>${tree.longitude.toFixed(5)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:11px;">${tree.notes || '—'}</td>
      </tr>`;
    }).join('');

    const now = new Date();
    printHTML(`
      <style>
        @page { margin: 15mm 12mm; }
        * { box-sizing: border-box; }
      </style>

      <!-- NAGŁÓWEK -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #22c55e;margin-bottom:20px;">
        <div>
          <div style="font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-0.5px;">🌳 Zielony Punkt</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">System Ewidencji Drzew — Park M</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px;font-weight:700;color:#111;">Raport Drzew</div>
          <div style="font-size:11px;color:#6b7280;">${now.toLocaleDateString('pl-PL', {day:'2-digit',month:'long',year:'numeric'})}</div>
          <div style="font-size:11px;color:#6b7280;">${now.toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>

      <!-- PODSUMOWANIE -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
          <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Projekt</div>
          <div style="font-size:13px;font-weight:700;color:#111;margin-top:2px;">${projectName}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 18px;text-align:center;">
          <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Łącznie drzew</div>
          <div style="font-size:24px;font-weight:900;color:#22c55e;">${filteredTrees.length}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 18px;text-align:center;">
          <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Posadzone</div>
          <div style="font-size:24px;font-weight:900;color:#22c55e;">${filteredTrees.filter(t=>t.status==='posadzone').length}</div>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 18px;text-align:center;">
          <div style="font-size:11px;color:#ea580c;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Utrzymanie</div>
          <div style="font-size:24px;font-weight:900;color:#ea580c;">${filteredTrees.filter(t=>t.status==='utrzymanie').length}</div>
        </div>
      </div>

      <!-- TABELA -->
      <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;">
        <thead>
          <tr style="background:#1a2e1a;">
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;white-space:nowrap;">Nr drzewa</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Gatunek</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Projekt</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;white-space:nowrap;">Data</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Wykonawca</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Status</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">GPS</th>
            <th style="padding:9px 10px;text-align:left;color:#4ade80;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Notatki</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- STOPKA -->
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
        <span>Zielony Punkt — System Ewidencji Drzew</span>
        <span>Raport wygenerowany: ${now.toLocaleString('pl-PL')}</span>
      </div>
    `);
  };

  const exportToExcel = () => {
    // Prepare CSV data
    const headers = [
      'ID', 
      'Numer Drzewa', 
      'Gatunek', 
      'Projekt - Kod', 
      'Projekt - Nazwa',
      'Projekt - Numer',
      'Projekt - Lokalizacja',
      'Projekt - Klient',
      'Projekt - Drzew do posadzenia',
      'Projekt - Drzew posadzonych',
      'Status', 
      'Data Posadzenia', 
      'Wykonawca', 
      'Szerokość GPS', 
      'Długość GPS', 
      'Notatki'
    ];
    const csvRows = [headers.join(';')];
    
    filteredTrees.forEach(tree => {
      // Find project details
      const project = projects.find(p => p.id === tree.project_id);
      
      const row = [
        tree.id,
        tree.tree_number || '',
        tree.species_name || '',
        tree.site_code || '',
        tree.site_name || '',
        project?.project_number || '',
        project?.location || '',
        project?.client || '',
        project?.trees_to_plant || '',
        project?.trees_planted || '',
        tree.status,
        new Date(tree.plant_date).toLocaleDateString('pl-PL'),
        tree.worker_name || '',
        tree.latitude.toFixed(6),
        tree.longitude.toFixed(6),
        tree.notes || ''
      ];
      csvRows.push(row.map(cell => `"${cell}"`).join(';'));
    });

    // Create blob and download
    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const projectName = filterProject 
      ? projects.find(p => p.id.toString() === filterProject)?.name || 'wszystkie'
      : 'wszystkie';
    const fileName = `drzewa_${projectName}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie drzew...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </Link>

        <div className="glass rounded-3xl p-6 md:p-8 gradient-border-green">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <TreePine className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-gradient-green">Lista Drzew</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportAllTreesToPDF}
                className="glass rounded-2xl text-red-400 border border-red-500/20 px-4 py-2 hover:bg-red-500/10 flex items-center gap-2 text-sm font-medium transition-all"
              >
                <FileText className="w-4 h-4" />
                Eksportuj do PDF
              </button>
              <button
                onClick={exportToExcel}
                className="glass rounded-2xl text-blue-400 border border-blue-500/20 px-4 py-2 hover:bg-blue-500/10 flex items-center gap-2 text-sm font-medium transition-all"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <Link
                href="/add-tree"
                className="font-bold text-sm text-white px-4 py-2 rounded-2xl hover:scale-105 transition-all" style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',boxShadow:'0 4px 12px rgba(34,197,94,0.3)'}}
              >
                + Dodaj Drzewo
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4 mb-3">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="input-modern"
            >
              <option value="">📁 Wszystkie projekty</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Szukaj po gatunku..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-modern"
            >
              <option value="">Wszystkie statusy</option>
              <option value="posadzone">Posadzone</option>
              <option value="utrzymanie">Utrzymanie</option>
              <option value="wymiana">Wymiana</option>
              <option value="usuniete">Usunięte</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">📅 Data od</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-modern" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">📅 Data do</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-modern" />
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">
              {filterProject ? `Projekt: ${projects.find(p => p.id.toString() === filterProject)?.name}` : 'Statystyki wszystkich projektów'}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label:'Wszystkie', val: projectStats.total,     color:'text-[#4ade80]',  from:'#16a34a',to:'#22c55e' },
                { label:'Posadzone', val: projectStats.posadzone, color:'text-cyan-400',   from:'#0e7490',to:'#06b6d4' },
                { label:'Utrzym.',   val: projectStats.utrzymanie,color:'text-yellow-400', from:'#a16207',to:'#eab308' },
                { label:'Wymiana',   val: projectStats.wymiana,   color:'text-violet-400', from:'#6d28d9',to:'#a78bfa' },
                { label:'Usunięte', val: projectStats.usuniete,  color:'text-red-400',    from:'#b91c1c',to:'#ef4444' },
              ].map(({ label, val, color, from, to }) => (
                <div key={label} className="text-center rounded-xl py-3 px-1" style={{background:`linear-gradient(135deg,${from}22,${to}22)`,border:`1px solid ${to}30`}}>
                  <p className={`text-xl font-black ${color}`}>{val}</p>
                  <p className="text-[9px] text-white/30 font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trees List */}
          <div className="space-y-4">
            {filteredTrees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nie znaleziono drzew</p>
              </div>
            ) : (
              filteredTrees.map((tree) => (
                <div key={tree.id} className="glass rounded-2xl overflow-hidden hover:-translate-y-0.5 transition-all">
                  <button onClick={() => openTreeDrawer(tree)} className="w-full text-left p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white">
                          {tree.tree_number && <span className="text-[#4ade80] mr-2">{tree.tree_number}</span>}
                          {tree.species_name || 'Nieznany gatunek'}
                        </h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${getStatusColor(tree.status)}`}>
                          {tree.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/20">#{tree.id}</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-1.5 text-xs text-white/40 mt-2">
                      <div className="flex items-center gap-1.5"><Building className="w-3 h-3" /><span>{tree.site_code} - {tree.site_name}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{new Date(tree.plant_date).toLocaleDateString('pl-PL')}</span></div>
                      {tree.worker_name && <div className="flex items-center gap-1.5"><User className="w-3 h-3" /><span>{tree.worker_name}</span></div>}
                      <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span>{tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}</span></div>
                    </div>
                    {tree.notes && <p className="text-xs text-white/30 mt-2 italic">{tree.notes}</p>}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedTreeId(expandedTreeId === tree.id ? null : tree.id); }}
                    className="w-full px-4 py-2 border-t border-white/5 hover:bg-white/5 transition-colors flex items-center justify-between text-xs text-white/30"
                  >
                    <span>{expandedTreeId === tree.id ? 'Ukryj akcje' : 'Pokaż akcje'}</span>
                    <svg 
                      className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${expandedTreeId === tree.id ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Actions list */}
                  {expandedTreeId === tree.id && (
                    <TreeActions treeId={tree.id} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drawer - Tree Details */}
      {isDrawerOpen && selectedTree && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden animate-slide-in rounded-l-[2rem]">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="flex gap-2">
                <Link
                  href={`/edit-tree/${selectedTree.id}`}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edytuj
                </Link>
                <button
                  onClick={() => handleDeleteTree(selectedTree.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Usuń
                </button>
                <button
                  onClick={exportTreeToPDF}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <Link
                  href={`/trees/${selectedTree.id}`}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M7 17 17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto h-[calc(100vh-72px)]">
              {/* Photo */}
              <div className="w-full">
                {treePhotos.length > 0 && !photoLoadError ? (
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      const urlForModal = toCloudinaryDisplayUrl(photoSrc || treePhotos[0]);
                      setSelectedPhoto(urlForModal);
                      setPhotoModalLoading(true);
                      setIsPhotoModalOpen(true);
                    }}
                  >
                    <img
                      src={photoSrc || treePhotos[0]}
                      alt="Zdjęcie drzewa"
                      className="w-full h-80 object-cover transition-opacity hover:opacity-90"
                      onError={() => {
                        const originalUrl = photoSrc || treePhotos[0];
                        console.error('Failed to load tree photo:', { url: originalUrl, treeId: selectedTree?.id });

                        if (typeof originalUrl === 'string' && originalUrl.includes('res.cloudinary.com')) {
                          // Fallback for cases like HEIC delivery where browser can't render.
                          // Step 1: f_auto,q_auto
                          // Step 2: force JPG
                          const withImageUpload = originalUrl
                            .replace('/raw/upload/', '/image/upload/')
                            .replace('/video/upload/', '/image/upload/');

                          if (photoFallbackStep === 0) {
                            const fallbackUrl = withImageUpload.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
                            console.log('Retrying tree photo with fallback URL (f_auto):', { fallbackUrl });
                            setPhotoFallbackStep(1);
                            setPhotoSrc(fallbackUrl);
                            return;
                          }

                          if (photoFallbackStep === 1) {
                            const fallbackUrl = withImageUpload.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
                            console.log('Retrying tree photo with fallback URL (f_jpg):', { fallbackUrl });
                            setPhotoFallbackStep(2);
                            setPhotoSrc(fallbackUrl);
                            return;
                          }
                        }

                        setPhotoLoadError(true);
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                      <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">Brak zdjęcia</p>
                      {treePhotos.length > 0 && photoLoadError && (
                        <a
                          href={treePhotos[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm text-green-700 dark:text-green-400 underline"
                        >
                          Otwórz zdjęcie w nowej karcie
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tree Info */}
              <div className="px-6 py-6 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {selectedTree.species_name || 'Nieznany gatunek'}
                  </h1>
                  {selectedTree.tree_number && (
                    <p className="text-lg text-green-600 dark:text-green-400 font-semibold">
                      {selectedTree.tree_number}
                    </p>
                  )}
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(selectedTree.status)}`}>
                    {selectedTree.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Building className="w-4 h-4" />
                      <span className="text-sm font-medium">Projekt</span>
                    </div>
                    <p className="text-gray-800 dark:text-white font-semibold">
                      {selectedTree.site_code} - {selectedTree.site_name}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Data posadzenia</span>
                    </div>
                    <p className="text-gray-800 dark:text-white font-semibold">
                      {new Date(selectedTree.plant_date).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {selectedTree.worker_name && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">Wykonawca</span>
                      </div>
                      <p className="text-gray-800 dark:text-white font-semibold">
                        {selectedTree.worker_name}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">Lokalizacja GPS</span>
                    </div>
                    <p className="text-gray-800 dark:text-white font-semibold text-sm">
                      {selectedTree.latitude.toFixed(6)}, {selectedTree.longitude.toFixed(6)}
                    </p>
                    {selectedTree.accuracy && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Dokładność: ±{selectedTree.accuracy}m
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedTree.notes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Notatki</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTree.notes}</p>
                  </div>
                )}


                {/* Metadata */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Informacje systemowe</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ID drzewa:</span>
                      <span className="text-gray-800 dark:text-white font-mono">#{selectedTree.id}</span>
                    </div>
                    {selectedTree.creator_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Dodane przez:</span>
                        <span className="text-gray-800 dark:text-white">{selectedTree.creator_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Data utworzenia:</span>
                      <span className="text-gray-800 dark:text-white">
                        {new Date(selectedTree.created_at).toLocaleString('pl-PL')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal - Full Screen */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4" onClick={() => setIsPhotoModalOpen(false)}>
          <button
            onClick={() => setIsPhotoModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-8 h-8 text-white" />
          </button>
          {photoModalLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
          <img
            src={selectedPhoto}
            alt="Pełne zdjęcie"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onLoad={() => setPhotoModalLoading(false)}
            onError={() => {
              // If fallback still fails, try forcing JPG
              if (selectedPhoto.includes('res.cloudinary.com') && !selectedPhoto.includes('/f_jpg')) {
                const forcedJpg = selectedPhoto.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
                setSelectedPhoto(forcedJpg);
                setPhotoModalLoading(true);
                return;
              }
              setPhotoModalLoading(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
