import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Search, Upload, Beaker, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataRow {
  id: string;
  section: string;
  key: string;
  value: string;
  confidence: number;
  sourceSpan?: string;
}

function withIds(rows: Omit<DataRow, 'id'>[]): DataRow[] {
  return rows.map((r) => ({ ...r, id: crypto.randomUUID() }));
}

function toCSV(rows: DataRow[]): string {
  const header = ["section", "key", "value", "confidence", "sourceSpan"];
  const lines = rows.map((r) =>
    [r.section, r.key, r.value, r.confidence, r.sourceSpan ?? ""]
      .map((s) => `"${String(s).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function download(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SAMPLE_DATA: Omit<DataRow, 'id'>[] = [
  { section: "Therapeutic Context", key: "Indication", value: "Breast cancer", confidence: 0.86, sourceSpan: "p2-3" },
  { section: "Drug Molecule", key: "API", value: "Doxorubicin", confidence: 0.93, sourceSpan: "p3" },
  { section: "Nanocarrier", key: "Type", value: "WPI-CHI-HA nanoparticles", confidence: 0.88, sourceSpan: "p4" },
  { section: "Formulation", key: "Method", value: "Ionic gelation + adsorption", confidence: 0.77, sourceSpan: "p5" },
  { section: "Characterization", key: "Size (DLS, Z-avg)", value: "142 nm", confidence: 0.91, sourceSpan: "Fig 2A" },
  { section: "Characterization", key: "PDI", value: "0.18", confidence: 0.84, sourceSpan: "Fig 2A" },
  { section: "Characterization", key: "Zeta potential", value: "+21.5 mV", confidence: 0.82, sourceSpan: "Fig 2B" },
  { section: "In vitro", key: "Cell line", value: "U2OS", confidence: 0.80, sourceSpan: "p7" },
  { section: "In vitro", key: "Uptake (24h)", value: "High (confocal)", confidence: 0.74, sourceSpan: "Fig 4" },
  { section: "Manufacturability", key: "Scalability note", value: "Shear-sensitive; microfluidics suggested", confidence: 0.66, sourceSpan: "p9" }
];

const getConfidenceBadgeVariant = (confidence: number) => {
  if (confidence >= 0.9) return "default";
  if (confidence >= 0.8) return "secondary";
  if (confidence >= 0.7) return "outline";
  return "destructive";
};

export default function Lumiscan() {
  const [tab, setTab] = useState("landing");
  const [rows, setRows] = useState<DataRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterSection, setFilterSection] = useState("All");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("lumiscan_mvp_rows");
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load saved data:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lumiscan_mvp_rows", JSON.stringify(rows));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const sectionOK = filterSection === "All" || r.section === filterSection;
      const text = `${r.key} ${r.value} ${r.sourceSpan ?? ""}`.toLowerCase();
      const qOK = q === "" || text.includes(q);
      return sectionOK && qOK;
    });
  }, [rows, filterSection, search]);

  const sections = useMemo(() => {
    return [...new Set(rows.map((r) => r.section))];
  }, [rows]);

  const handleExtract = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setRows(withIds(SAMPLE_DATA));
      setTab("results");
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted ${SAMPLE_DATA.length} data points from the document.`,
      });
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: "An error occurred while processing the document.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setRows(withIds(SAMPLE_DATA));
    setTab("results");
    toast({
      title: "Sample Data Loaded",
      description: "Loaded sample nanomedicine research data.",
    });
  };

  const updateRow = (index: number, field: keyof DataRow, value: string | number) => {
    const newRows = [...rows];
    const actualIndex = rows.findIndex(r => r.id === filtered[index].id);
    if (actualIndex !== -1) {
      (newRows[actualIndex] as any)[field] = value;
      setRows(newRows);
    }
  };

  const deleteRow = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
    toast({
      title: "Row Deleted",
      description: "Data point has been removed.",
    });
  };

  const exportData = (format: 'json' | 'csv') => {
    if (rows.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please extract or load some data first.",
        variant: "destructive",
      });
      return;
    }

    if (format === 'json') {
      download("lumiscan-data.json", JSON.stringify(rows, null, 2), "application/json");
    } else {
      download("lumiscan-data.csv", toCSV(rows), "text/csv");
    }
    
    toast({
      title: "Export Successful",
      description: `Data exported as ${format.toUpperCase()} file.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-surface relative overflow-hidden">
      {/* Background orb */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-orb rounded-full opacity-20 blur-3xl animate-pulse"></div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/20 bg-card/20 backdrop-blur supports-[backdrop-filter]:bg-card/20">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Beaker className="h-8 w-8 text-primary drop-shadow-glow" />
              <div className="absolute inset-0 h-8 w-8 text-primary animate-pulse opacity-50"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-wider">
                LUMISCAN
              </h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                Intelligent Data Extraction
              </p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={setTab} className="w-auto">
            <TabsList className="grid grid-cols-4 w-fit">
              <TabsTrigger value="landing" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Home
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                Results
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-1">
                About
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          {/* Landing Page */}
          <TabsContent value="landing" className="space-y-12 relative">
            {/* Central orb */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-orb rounded-full opacity-30 blur-2xl"></div>
            
            <div className="text-center space-y-8 max-w-4xl mx-auto relative z-10">
              <div className="space-y-6">
                <div className="relative">
                  <h2 className="text-6xl font-bold text-primary tracking-wider mb-4">
                    LUMISCAN
                  </h2>
                  <p className="text-lg text-accent tracking-wide font-medium">
                    Intelligent Data Extraction for Drug Delivery
                  </p>
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Transform research papers into structured nanomedicine data instantly. 
                  Upload PDFs or paste URLs to unlock organized, searchable insights.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
                <Button 
                  size="lg" 
                  onClick={() => setTab("upload")}
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-12 py-4 text-lg font-semibold tracking-wide rounded-full"
                >
                  ENTER
                </Button>
                <Button variant="outline" size="lg" onClick={handleLoadSample} className="border-primary/30 text-primary hover:bg-primary/10">
                  <FileText className="h-5 w-5" />
                  Sample Data
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative z-10">
              <Card className="bg-gradient-card border border-border/20 shadow-medium hover:shadow-glow transition-all duration-500 hover:scale-105">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-primary text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Upload className="h-5 w-5" />
                    </div>
                    Upload & Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload PDF files or paste article URLs. Our AI extracts key nanomedicine data points automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border border-border/20 shadow-medium hover:shadow-glow transition-all duration-500 hover:scale-105">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-primary text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Search className="h-5 w-5" />
                    </div>
                    Review & Edit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Review extracted data with confidence scores. Filter, search, and edit results to ensure accuracy.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border border-border/20 shadow-medium hover:shadow-glow transition-all duration-500 hover:scale-105">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-primary text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Download className="h-5 w-5" />
                    </div>
                    Export Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Export your structured data as JSON or CSV for further analysis and integration with your research workflow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Upload Page */}
          <TabsContent value="upload" className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Upload Document</h2>
                <p className="text-muted-foreground">
                  Choose a PDF file or paste an article URL to extract structured data.
                </p>
              </div>

              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>Document Input</CardTitle>
                  <CardDescription>
                    Upload a research paper PDF or provide a URL to the article.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload PDF File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                      className="cursor-pointer"
                    />
                    {fileName && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {fileName}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url-input">Article URL</Label>
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com/research-paper"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleExtract} 
                    disabled={loading || (!fileName && !url)}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                        Extracting Data...
                      </>
                    ) : (
                      <>
                        <Beaker className="h-4 w-4" />
                        Extract Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Page */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold">Extracted Data</h2>
                <p className="text-muted-foreground">
                  {filtered.length} of {rows.length} data points shown
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="success" onClick={() => exportData('json')}>
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="success" onClick={() => exportData('csv')}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {rows.length === 0 ? (
              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a document or load sample data to get started.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setTab("upload")}>
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </Button>
                    <Button variant="outline" onClick={handleLoadSample}>
                      Load Sample Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search data points..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Card className="bg-gradient-card border-0 shadow-medium">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((row, index) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                value={row.section}
                                onChange={(e) => updateRow(index, 'section', e.target.value)}
                                className="border-0 bg-transparent focus:bg-background"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.key}
                                onChange={(e) => updateRow(index, 'key', e.target.value)}
                                className="border-0 bg-transparent focus:bg-background"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.value}
                                onChange={(e) => updateRow(index, 'value', e.target.value)}
                                className="border-0 bg-transparent focus:bg-background"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={row.confidence}
                                  onChange={(e) => updateRow(index, 'confidence', parseFloat(e.target.value))}
                                  className="w-20 border-0 bg-transparent focus:bg-background"
                                />
                                <Badge variant={getConfidenceBadgeVariant(row.confidence)}>
                                  {Math.round(row.confidence * 100)}%
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.sourceSpan || ""}
                                onChange={(e) => updateRow(index, 'sourceSpan', e.target.value)}
                                className="border-0 bg-transparent focus:bg-background"
                                placeholder="Source reference"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteRow(row.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* About Page */}
          <TabsContent value="about" className="space-y-6">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">About Lumiscan</h2>
                <p className="text-lg text-muted-foreground">
                  Advanced AI-powered data extraction for nanomedicine research
                </p>
              </div>

              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>What is Lumiscan?</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-slate max-w-none">
                  <p>
                    Lumiscan is a cutting-edge tool designed to streamline the extraction of structured data 
                    from nanomedicine research articles. By leveraging advanced AI algorithms, it can 
                    automatically identify and extract key information points from scientific papers.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Upload PDF documents or paste article URLs</li>
                    <li>AI-powered extraction of nanomedicine data points</li>
                    <li>Interactive review and editing of extracted data</li>
                    <li>Confidence scoring for each extracted data point</li>
                    <li>Flexible filtering and search capabilities</li>
                    <li>Export data in JSON and CSV formats</li>
                    <li>Persistent local storage of your work</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>Data Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">Lumiscan extracts information across these key categories:</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Therapeutic Context",
                      "Drug Molecule",
                      "Nanocarrier",
                      "Formulation",
                      "Characterization",
                      "In vitro Studies",
                      "In vivo Studies", 
                      "Manufacturability"
                    ].map((category) => (
                      <Badge key={category} variant="outline" className="justify-start">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}