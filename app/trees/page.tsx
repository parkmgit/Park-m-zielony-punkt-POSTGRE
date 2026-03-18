'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, MapPin, Calendar, User, Building, X, Download, FileText, Edit, Trash2 } from 'lucide-react';
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
    
    return matchesSearch && matchesStatus && matchesProject;
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

  const exportTreeToPDF = () => {
    if (!selectedTree) return;
    
    const project = projects.find(p => p.id === selectedTree.project_id);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const photoHTML = treePhotos.length > 0 
      ? `<img src="${treePhotos[0]}" style="max-width: 100%; height: auto; margin-bottom: 20px;" />`
      : '<div style="background: #f0f0f0; padding: 40px; text-align: center; margin-bottom: 20px;">Brak zdjęcia</div>';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Raport Drzewa - ${selectedTree.tree_number || selectedTree.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #22c55e; }
          .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin: 20px 0; }
          .info-label { font-weight: bold; }
          .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Raport Drzewa</h1>
        
        ${photoHTML}
        
        <div class="section">
          <h2>Informacje podstawowe</h2>
          <div class="info-grid">
            <div class="info-label">ID:</div><div>${selectedTree.id}</div>
            <div class="info-label">Numer drzewa:</div><div>${selectedTree.tree_number || '-'}</div>
            <div class="info-label">Gatunek:</div><div>${selectedTree.species_name || '-'}</div>
            <div class="info-label">Status:</div><div>${selectedTree.status}</div>
            <div class="info-label">Data posadzenia:</div><div>${new Date(selectedTree.plant_date).toLocaleDateString('pl-PL')}</div>
            <div class="info-label">Wykonawca:</div><div>${selectedTree.worker_name || '-'}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Projekt</h2>
          <div class="info-grid">
            <div class="info-label">Kod:</div><div>${selectedTree.site_code}</div>
            <div class="info-label">Nazwa:</div><div>${selectedTree.site_name}</div>
            <div class="info-label">Numer projektu:</div><div>${project?.project_number || '-'}</div>
            <div class="info-label">Lokalizacja:</div><div>${project?.location || '-'}</div>
            <div class="info-label">Klient:</div><div>${project?.client || '-'}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Lokalizacja GPS</h2>
          <div class="info-grid">
            <div class="info-label">Szerokość:</div><div>${selectedTree.latitude.toFixed(6)}</div>
            <div class="info-label">Długość:</div><div>${selectedTree.longitude.toFixed(6)}</div>
            ${selectedTree.accuracy ? `<div class="info-label">Dokładność:</div><div>±${selectedTree.accuracy}m</div>` : ''}
          </div>
        </div>
        
        ${selectedTree.notes ? `
        <div class="section">
          <h2>Notatki</h2>
          <p>${selectedTree.notes}</p>
        </div>
        ` : ''}
        
        ${treeActions.length > 0 ? `
        <div class="section">
          <h2>Historia akcji (${treeActions.length})</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #e5e7eb; text-align: left;">
                <th style="padding: 8px; border: 1px solid #d1d5db;">Data</th>
                <th style="padding: 8px; border: 1px solid #d1d5db;">Typ akcji</th>
                <th style="padding: 8px; border: 1px solid #d1d5db;">Wykonawca</th>
                <th style="padding: 8px; border: 1px solid #d1d5db;">Notatki</th>
              </tr>
            </thead>
            <tbody>
              ${treeActions.map(action => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${new Date(action.performed_at).toLocaleDateString('pl-PL')}</td>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${action.action_type}</td>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${action.performer_name || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${action.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="section">
          <h2>Informacje systemowe</h2>
          <div class="info-grid">
            <div class="info-label">Dodane przez:</div><div>${selectedTree.creator_name || '-'}</div>
            <div class="info-label">Data utworzenia:</div><div>${new Date(selectedTree.created_at).toLocaleString('pl-PL')}</div>
          </div>
        </div>
        
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Drukuj / Zapisz jako PDF
        </button>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const exportAllTreesToPDF = async () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Raport Drzew</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #22c55e; text-align: center; }
          .summary { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .tree-card { 
            page-break-inside: avoid; 
            border: 2px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 15px; 
            margin: 20px 0; 
            background: white;
          }
          .tree-header { 
            display: flex; 
            align-items: center; 
            gap: 15px; 
            margin-bottom: 15px;
            border-bottom: 2px solid #22c55e;
            padding-bottom: 10px;
          }
          .tree-photo { 
            width: 120px; 
            height: 120px; 
            object-fit: cover; 
            border-radius: 8px;
            border: 2px solid #e5e7eb;
          }
          .tree-photo-placeholder {
            width: 120px; 
            height: 120px; 
            background: #f3f4f6;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 12px;
          }
          .tree-title { flex: 1; }
          .tree-title h2 { margin: 0; color: #22c55e; font-size: 18px; }
          .tree-title .id { color: #6b7280; font-size: 14px; }
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 10px;
          }
          .info-item { 
            display: flex; 
            gap: 8px;
            font-size: 13px;
          }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #6b7280; }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-posadzone { background: #dcfce7; color: #166534; }
          .status-podlewanie { background: #dbeafe; color: #1e40af; }
          .status-utrzymanie { background: #dbeafe; color: #1e40af; }
          .status-wymiana { background: #fef3c7; color: #92400e; }
          .status-usuniete { background: #fee2e2; color: #991b1b; }
          @media print {
            body { padding: 10px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Raport Drzew - ${filterProject ? projects.find(p => p.id.toString() === filterProject)?.name : 'Wszystkie projekty'}</h1>
        
        <div class="summary">
          <strong>Podsumowanie:</strong><br/>
          Liczba drzew: ${filteredTrees.length}<br/>
          Data raportu: ${new Date().toLocaleDateString('pl-PL')}
        </div>
        
        <div id="trees-container">
          <p style="text-align: center; color: #6b7280;">Ładowanie drzew...</p>
        </div>
        
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; display: block; margin: 20px auto;">
          Drukuj / Zapisz jako PDF
        </button>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Load photos and generate tree cards
    const treesContainer = printWindow.document.getElementById('trees-container');
    if (!treesContainer) return;
    
    treesContainer.innerHTML = '';
    
    for (const tree of filteredTrees) {
      const project = projects.find(p => p.id === tree.project_id);
      
      // Fetch photo and actions for this tree
      let photoURL = '';
      let actions: any[] = [];
      try {
        const [photosRes, actionsRes] = await Promise.all([
          fetch(`/api/photos?entity_type=tree&entity_id=${tree.id}`),
          fetch(`/api/trees/${tree.id}/actions`)
        ]);
        const photos = await photosRes.json();
        actions = await actionsRes.json();
        if (photos.length > 0) {
          photoURL = photos[0].url;
        }
      } catch (error) {
        console.error('Error fetching tree data:', error);
      }
      
      const photoHTML = photoURL 
        ? `<img src="${photoURL}" class="tree-photo" />`
        : '<div class="tree-photo-placeholder">Brak zdjęcia</div>';
      
      const treeCard = `
        <div class="tree-card">
          <div class="tree-header">
            ${photoHTML}
            <div class="tree-title">
              <h2>${tree.species_name || 'Nieznany gatunek'}</h2>
              <div class="id">ID: ${tree.id} | ${tree.tree_number || 'Brak numeru'}</div>
              <span class="status-badge status-${tree.status}">${tree.status}</span>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Projekt:</span>
              <span class="info-value">${tree.site_code} - ${tree.site_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Numer projektu:</span>
              <span class="info-value">${project?.project_number || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Lokalizacja:</span>
              <span class="info-value">${project?.location || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Klient:</span>
              <span class="info-value">${project?.client || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data posadzenia:</span>
              <span class="info-value">${new Date(tree.plant_date).toLocaleDateString('pl-PL')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Wykonawca:</span>
              <span class="info-value">${tree.worker_name || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">GPS:</span>
              <span class="info-value">${tree.latitude.toFixed(6)}, ${tree.longitude.toFixed(6)}</span>
            </div>
            ${tree.notes ? `
            <div class="info-item" style="grid-column: 1 / -1;">
              <span class="info-label">Notatki:</span>
              <span class="info-value">${tree.notes}</span>
            </div>
            ` : ''}
          </div>
          
          ${actions.length > 0 ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <strong style="color: #22c55e;">Historia akcji (${actions.length}):</strong>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 6px; border: 1px solid #d1d5db; text-align: left;">Data</th>
                  <th style="padding: 6px; border: 1px solid #d1d5db; text-align: left;">Typ akcji</th>
                  <th style="padding: 6px; border: 1px solid #d1d5db; text-align: left;">Wykonawca</th>
                  <th style="padding: 6px; border: 1px solid #d1d5db; text-align: left;">Notatki</th>
                </tr>
              </thead>
              <tbody>
                ${actions.map(action => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #d1d5db;">${new Date(action.performed_at).toLocaleDateString('pl-PL')}</td>
                    <td style="padding: 6px; border: 1px solid #d1d5db;">${action.action_type}</td>
                    <td style="padding: 6px; border: 1px solid #d1d5db;">${action.performer_name || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #d1d5db;">${action.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>
      `;
      
      treesContainer.innerHTML += treeCard;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        <Link href="/" className="inline-flex items-center text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Powrót
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Lista Drzew</h1>
            <div className="flex gap-3">
              <button
                onClick={exportAllTreesToPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Eksportuj do PDF
              </button>
              <button
                onClick={exportToExcel}
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <Link
                href="/add-tree"
                className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700"
              >
                + Dodaj Drzewo
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Wszystkie statusy</option>
              <option value="posadzone">Posadzone</option>
              <option value="utrzymanie">Utrzymanie</option>
              <option value="wymiana">Wymiana</option>
              <option value="usuniete">Usunięte</option>
            </select>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-3xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {filterProject ? `Statystyki projektu: ${projects.find(p => p.id.toString() === filterProject)?.name}` : 'Statystyki wszystkich projektów'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Wszystkie</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{projectStats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Posadzone</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{projectStats.posadzone}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Utrzymanie</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{projectStats.utrzymanie}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Wymiana</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{projectStats.wymiana}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Usunięte</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{projectStats.usuniete}</p>
              </div>
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
                <div key={tree.id} className="border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden">
                  <button
                    onClick={() => openTreeDrawer(tree)}
                    className="w-full text-left p-4 hover:shadow-md hover:border-green-500 dark:hover:border-green-500 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                          {tree.tree_number && <span className="text-green-600 dark:text-green-400 mr-2">{tree.tree_number}</span>}
                          {tree.species_name || 'Nieznany gatunek'}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(tree.status)}`}>
                          {tree.status}
                        </span>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        ID: {tree.id}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 mt-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>{tree.site_code} - {tree.site_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(tree.plant_date).toLocaleDateString('pl-PL')}</span>
                      </div>
                      {tree.worker_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{tree.worker_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}</span>
                      </div>
                    </div>

                    {tree.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                        {tree.notes}
                      </p>
                    )}
                  </button>
                  
                  {/* Actions toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTreeId(expandedTreeId === tree.id ? null : tree.id);
                    }}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {expandedTreeId === tree.id ? 'Ukryj akcje' : 'Pokaż akcje'}
                    </span>
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
