export type Engine = 'mermaid' | 'graphviz' | 'nomnoml' | 'wavedrom' | 'vegalite';

export interface TemplateItem {
  name: string;
  code: string;
}

export interface TemplateCategory {
  label: string;
  items: TemplateItem[];
}

export interface EngineInfo {
  id: Engine;
  label: string;
  fence: string;
  categories: TemplateCategory[];
}

export const engines: EngineInfo[] = [
  // ──────────────── MERMAID ────────────────
  {
    id: 'mermaid',
    label: 'Mermaid',
    fence: 'mermaid',
    categories: [
      {
        label: 'Flow',
        items: [
          { name: 'Flowchart', code: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E` },
          { name: 'Sequence', code: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob
    B-->>A: Hi Alice
    A->>B: How are you?
    B-->>A: Great!` },
          { name: 'State', code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Done : Complete
    Processing --> Error : Fail
    Error --> Idle : Retry
    Done --> [*]` },
          { name: 'Journey', code: `journey
    title My Working Day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me` },
        ]
      },
      {
        label: 'Structure',
        items: [
          { name: 'Class', code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +fetch() void
    }
    class Cat {
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat` },
          { name: 'ER', code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    CUSTOMER {
        string name
        string email
        int id
    }
    ORDER {
        int id
        date created
        string status
    }
    LINE_ITEM {
        int quantity
        float price
        string product
    }` },
          { name: 'Block', code: `block-beta
    columns 3
    a["Frontend"]:3
    block:backend:2
      columns 2
      c["API Server"]
      d["Auth Service"]
    end
    e["Database"]
    a --> backend
    backend --> e` },
          { name: 'Architecture', code: `architecture-beta
    group api(cloud)[API Layer]

    service db(database)[Database] in api
    service server(server)[Server] in api
    service disk(disk)[Storage] in api

    db:R -- L:server
    server:R -- L:disk` },
        ]
      },
      {
        label: 'Data',
        items: [
          { name: 'Pie', code: `pie title Favorite Languages
    "JavaScript" : 35
    "Python" : 30
    "TypeScript" : 20
    "Rust" : 15` },
          { name: 'Gantt', code: `gantt
    title Project Schedule
    dateFormat  YYYY-MM-DD
    section Planning
    Research       :a1, 2024-01-01, 7d
    Design         :a2, after a1, 5d
    section Development
    Implementation :b1, after a2, 14d
    Testing        :b2, after b1, 7d` },
          { name: 'XY Chart', code: `xychart-beta
    title "Sales Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9800, 10500]
    line [5000, 6000, 7500, 8200, 9800, 10500]` },
          { name: 'Quadrant', code: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]` },
          { name: 'Sankey', code: `sankey-beta

Budget,Marketing,30000
Budget,Development,50000
Budget,Operations,20000
Marketing,Social Media,15000
Marketing,Ads,15000
Development,Frontend,25000
Development,Backend,25000
Operations,Hosting,12000
Operations,Support,8000` },
        ]
      },
      {
        label: 'Other',
        items: [
          { name: 'Git Graph', code: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    branch feature
    checkout feature
    commit
    checkout main
    merge feature` },
          { name: 'Mindmap', code: `mindmap
  root((Project))
    Planning
      Requirements
      Timeline
      Budget
    Development
      Frontend
      Backend
      Database
    Testing
      Unit Tests
      Integration
      UAT
    Deployment
      Staging
      Production` },
          { name: 'Timeline', code: `timeline
    title History of Technology
    1970 : Unix created
         : C language born
    1980 : IBM PC released
         : MS-DOS
    1990 : World Wide Web
         : Linux kernel
    2000 : Wikipedia launched
         : iPod released
    2010 : Instagram
         : Docker created
    2020 : GPT-3 released
         : Remote work boom` },
          { name: 'Requirement', code: `requirementDiagram
    requirement test_req {
        id: 1
        text: The system shall do something
        risk: high
        verifymethod: test
    }
    element test_entity {
        type: simulation
    }
    test_entity - satisfies -> test_req` },
          { name: 'Packet', code: `packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
  32-63: "Sequence Number"
  64-95: "Acknowledgment Number"
  96-99: "Data Offset"
  100-105: "Reserved"
  106-111: "Flags"
  112-127: "Window Size"
  128-143: "Checksum"
  144-159: "Urgent Pointer"` },
          { name: 'Kanban', code: `kanban
  Todo
    Design landing page
    Write API docs
  In Progress
    Build auth module
    Setup CI/CD
  Done
    Project setup
    Database schema` },
        ]
      }
    ]
  },

  // ──────────────── GRAPHVIZ ────────────────
  {
    id: 'graphviz',
    label: 'Graphviz',
    fence: 'dot',
    categories: [
      {
        label: 'Graphs',
        items: [
          { name: 'Directed', code: `digraph G {
    rankdir=LR
    node [shape=box style=filled fillcolor="#e8f4f8"]

    Start -> Parse -> Validate
    Validate -> Process -> Output
    Validate -> Error [style=dashed color=red]
    Error -> Parse [label="retry"]
}` },
          { name: 'Undirected', code: `graph Network {
    layout=neato
    node [shape=circle style=filled fillcolor="#f0f0f0" width=0.8]

    Server -- Router
    Router -- Switch1
    Router -- Switch2
    Switch1 -- PC1
    Switch1 -- PC2
    Switch2 -- PC3
    Switch2 -- Printer

    Server [shape=box fillcolor="#e8f4f8"]
    Router [shape=diamond fillcolor="#ffe8e8"]
}` },
          { name: 'Cluster', code: `digraph Architecture {
    compound=true

    subgraph cluster_frontend {
        label="Frontend"
        style=filled
        color="#e8f4f8"
        React -> Redux -> API_Client
    }

    subgraph cluster_backend {
        label="Backend"
        style=filled
        color="#f0ffe0"
        Express -> Auth -> DB_Layer
    }

    API_Client -> Express [lhead=cluster_backend ltail=cluster_frontend]
}` },
        ]
      },
      {
        label: 'Diagrams',
        items: [
          { name: 'Record/UML', code: `digraph DataModel {
    node [shape=record]

    User [label="{User|+ id: int\\l+ name: string\\l+ email: string\\l|+ login()\\l+ logout()\\l}"]
    Post [label="{Post|+ id: int\\l+ title: string\\l+ body: text\\l|+ publish()\\l+ archive()\\l}"]
    Comment [label="{Comment|+ id: int\\l+ text: string\\l|+ edit()\\l+ delete()\\l}"]

    User -> Post [label="writes" headlabel="*" taillabel="1"]
    Post -> Comment [label="has" headlabel="*" taillabel="1"]
    User -> Comment [label="posts" style=dashed]
}` },
          { name: 'Tree', code: `digraph OrgChart {
    node [shape=box style="filled,rounded" fillcolor="#f5f5f5"]

    CEO -> {CTO CFO CMO}
    CTO -> {"VP Eng" "VP Product"}
    CFO -> {Controller Treasurer}
    CMO -> {"Brand Dir" "Sales Dir"}
    "VP Eng" -> {"Lead 1" "Lead 2"}

    CEO [fillcolor="#4a90d9" fontcolor=white]
    CTO [fillcolor="#7ab648"]
    CFO [fillcolor="#e8a838"]
    CMO [fillcolor="#d94a4a" fontcolor=white]
}` },
          { name: 'State Machine', code: `digraph FSM {
    rankdir=LR
    node [shape=circle]

    start [shape=point width=0.2]
    accept [shape=doublecircle]

    start -> q0
    q0 -> q1 [label="a"]
    q1 -> q0 [label="b"]
    q1 -> q2 [label="a"]
    q2 -> accept [label="b"]
    q2 -> q2 [label="a"]
    accept -> q0 [label="a,b" style=dashed]
}` },
        ]
      }
    ]
  },

  // ──────────────── NOMNOML ────────────────
  {
    id: 'nomnoml',
    label: 'Nomnoml',
    fence: 'nomnoml',
    categories: [
      {
        label: 'UML',
        items: [
          { name: 'Class', code: `[Animal|+name: string;+age: int|+makeSound();+move()]
[Dog|+breed: string|+fetch();+bark()]
[Cat|+indoor: bool|+purr();+scratch()]
[Animal]<:-[Dog]
[Animal]<:-[Cat]` },
          { name: 'Use Case', code: `[<actor> Customer]
[<actor> Admin]

[Customer] -> [Browse Products]
[Customer] -> [Place Order]
[Admin] -> [Manage Inventory]
[Admin] -> [View Reports]
[Place Order] -> [Process Payment]` },
          { name: 'Activity', code: `[<start> o] -> [Receive Order]
[Receive Order] -> [<choice> In Stock?]
[In Stock?] yes -> [Ship Order]
[In Stock?] no -> [Restock]
[Restock] -> [Ship Order]
[Ship Order] -> [Send Invoice]
[Send Invoice] -> [<end> o]` },
        ]
      },
      {
        label: 'Architecture',
        items: [
          { name: 'Component', code: `[<package> E-Commerce|
  [<component> Web UI] -> [<component> API Gateway]
  [<component> API Gateway] -> [<component> User Service]
  [<component> API Gateway] -> [<component> Order Service]
  [<component> User Service] -> [<database> Users DB]
  [<component> Order Service] -> [<database> Orders DB]
]` },
          { name: 'Package', code: `[<frame> Frontend|
  [React App] -> [State Store]
  [State Store] -> [API Client]
]

[<frame> Backend|
  [REST API] -> [Business Logic]
  [Business Logic] -> [Data Access]
  [Data Access] -> [<database> PostgreSQL]
]

[API Client] -> [REST API]` },
        ]
      }
    ]
  },

  // ──────────────── WAVEDROM ────────────────
  {
    id: 'wavedrom',
    label: 'WaveDrom',
    fence: 'wavedrom',
    categories: [
      {
        label: 'Signals',
        items: [
          { name: 'Clock & Data', code: `{ "signal": [
  { "name": "clk",  "wave": "p........" },
  { "name": "data", "wave": "x.345x...", "data": ["A", "B", "C"] },
  { "name": "req",  "wave": "0.1..0..." },
  { "name": "ack",  "wave": "0..1..0.." }
]}` },
          { name: 'Bus Protocol', code: `{ "signal": [
  { "name": "clk",  "wave": "p......." },
  { "name": "addr", "wave": "x.3.x...", "data": ["A1"] },
  { "name": "wr",   "wave": "0.1.0..." },
  { "name": "data", "wave": "x..4x...", "data": ["D1"] },
  { "name": "ack",  "wave": "0...10.." }
], "config": { "hscale": 2 } }` },
          { name: 'Register', code: `{ "reg": [
  { "bits": 8,  "name": "data" },
  { "bits": 4,  "name": "addr" },
  { "bits": 1,  "name": "wr" },
  { "bits": 1,  "name": "rd" },
  { "bits": 2,  "name": "reserved", "type": 1 }
], "config": { "hspace": 800 } }` },
        ]
      }
    ]
  },

  // ──────────────── VEGA-LITE ────────────────
  {
    id: 'vegalite',
    label: 'Vega-Lite',
    fence: 'vega-lite',
    categories: [
      {
        label: 'Basic',
        items: [
          { name: 'Bar Chart', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55},
      {"category": "C", "value": 43},
      {"category": "D", "value": 91},
      {"category": "E", "value": 81}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal", "legend": null}
  }
}` },
          { name: 'Line Chart', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"month": "Jan", "sales": 100},
      {"month": "Feb", "sales": 250},
      {"month": "Mar", "sales": 300},
      {"month": "Apr", "sales": 450},
      {"month": "May", "sales": 400},
      {"month": "Jun", "sales": 600}
    ]
  },
  "mark": {"type": "line", "point": true},
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "sales", "type": "quantitative"}
  }
}` },
          { name: 'Scatter', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"x": 1, "y": 2, "cat": "A"}, {"x": 3, "y": 5, "cat": "A"},
      {"x": 5, "y": 3, "cat": "B"}, {"x": 7, "y": 8, "cat": "B"},
      {"x": 2, "y": 6, "cat": "A"}, {"x": 6, "y": 4, "cat": "B"},
      {"x": 4, "y": 7, "cat": "A"}, {"x": 8, "y": 9, "cat": "B"}
    ]
  },
  "mark": "point",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"},
    "color": {"field": "cat", "type": "nominal"}
  }
}` },
        ]
      },
      {
        label: 'Advanced',
        items: [
          { name: 'Heatmap', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 300,
  "height": 200,
  "data": {
    "values": [
      {"day": "Mon", "time": "Morning", "val": 5},
      {"day": "Mon", "time": "Afternoon", "val": 8},
      {"day": "Mon", "time": "Evening", "val": 3},
      {"day": "Tue", "time": "Morning", "val": 7},
      {"day": "Tue", "time": "Afternoon", "val": 9},
      {"day": "Tue", "time": "Evening", "val": 4},
      {"day": "Wed", "time": "Morning", "val": 6},
      {"day": "Wed", "time": "Afternoon", "val": 5},
      {"day": "Wed", "time": "Evening", "val": 8},
      {"day": "Thu", "time": "Morning", "val": 9},
      {"day": "Thu", "time": "Afternoon", "val": 3},
      {"day": "Thu", "time": "Evening", "val": 7}
    ]
  },
  "mark": "rect",
  "encoding": {
    "x": {"field": "day", "type": "nominal"},
    "y": {"field": "time", "type": "nominal"},
    "color": {"field": "val", "type": "quantitative", "scale": {"scheme": "blues"}}
  }
}` },
          { name: 'Histogram', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"val": 12}, {"val": 15}, {"val": 22}, {"val": 25}, {"val": 28},
      {"val": 30}, {"val": 32}, {"val": 35}, {"val": 38}, {"val": 40},
      {"val": 42}, {"val": 45}, {"val": 48}, {"val": 50}, {"val": 55},
      {"val": 33}, {"val": 36}, {"val": 29}, {"val": 44}, {"val": 41}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"bin": true, "field": "val", "type": "quantitative", "title": "Value"},
    "y": {"aggregate": "count", "type": "quantitative", "title": "Count"}
  }
}` },
          { name: 'Area Chart', code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"month": "Jan", "value": 10, "series": "Sales"},
      {"month": "Feb", "value": 25, "series": "Sales"},
      {"month": "Mar", "value": 40, "series": "Sales"},
      {"month": "Apr", "value": 55, "series": "Sales"},
      {"month": "Jan", "value": 5, "series": "Costs"},
      {"month": "Feb", "value": 15, "series": "Costs"},
      {"month": "Mar", "value": 20, "series": "Costs"},
      {"month": "Apr", "value": 30, "series": "Costs"}
    ]
  },
  "mark": "area",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative", "stack": true},
    "color": {"field": "series", "type": "nominal"}
  }
}` },
        ]
      }
    ]
  }
];

export function getEngine(id: Engine): EngineInfo {
  return engines.find(e => e.id === id)!;
}

export function getDefaultCode(id: Engine): string {
  return getEngine(id).categories[0].items[0].code;
}
