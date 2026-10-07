"""Default school catalog — mirrors frontend seed so first boot has a shared system."""

from __future__ import annotations

SEED_CATALOG: dict = {
    "students": [
        {"id": "stu-sara", "name": "Sara Benali", "email": "sara.benali@example.edu"},
        {"id": "stu-yassine", "name": "Yassine Karim", "email": "yassine.karim@example.edu"},
        {"id": "stu-nour", "name": "Nour Haddad", "email": "nour.haddad@example.edu"},
        {"id": "stu-amine", "name": "Amine Bouchra", "email": "amine.bouchra@example.edu"},
        {"id": "stu-lina", "name": "Lina Ait", "email": "lina.ait@example.edu"},
        {"id": "stu-omar", "name": "Omar Idrissi", "email": "omar.idrissi@example.edu"},
        {"id": "stu-meryem", "name": "Meryem Saidi", "email": "meryem.saidi@example.edu"},
        {"id": "stu-ilyas", "name": "Ilyas Naji", "email": "ilyas.naji@example.edu"},
        {"id": "stu-rim", "name": "Rim Othmani", "email": "rim.othmani@example.edu"},
        {"id": "stu-karim", "name": "Karim Faraj", "email": "karim.faraj@example.edu"},
    ],
    "courses": [
        {
            "id": "python-foundations",
            "title": "Python Foundations",
            "description": "Core programming concepts, OOP basics, exercises, and exam prep.",
            "status": "Published",
            "chapters": [
                {
                    "id": "py-ch-1",
                    "title": "Control Flow",
                    "order": 1,
                    "summary": "Conditionals, loops, and function basics with practice sets.",
                    "materials": [
                        {
                            "id": "py-loops-exercises",
                            "title": "Loops and Functions - Practice Set.docx",
                            "kind": "exercise",
                            "size": "940 KB",
                            "uploadedAt": "Yesterday",
                            "status": "Published",
                        }
                    ],
                },
                {
                    "id": "py-ch-2",
                    "title": "Object-Oriented Programming",
                    "order": 2,
                    "summary": "Classes, instances, inheritance, and composition.",
                    "materials": [
                        {
                            "id": "py-oop-pdf",
                            "title": "Chapter 4 - Object-Oriented Programming.pdf",
                            "kind": "pdf",
                            "size": "2.8 MB",
                            "uploadedAt": "Today",
                            "status": "Published",
                        }
                    ],
                },
                {
                    "id": "py-ch-3",
                    "title": "Revision",
                    "order": 3,
                    "summary": "Midterm review notes and worked examples.",
                    "materials": [
                        {
                            "id": "py-exam-notes",
                            "title": "Midterm Revision Notes.md",
                            "kind": "notes",
                            "size": "48 KB",
                            "uploadedAt": "2 days ago",
                            "status": "Draft",
                        }
                    ],
                },
            ],
        },
        {
            "id": "machine-learning",
            "title": "Machine Learning Essentials",
            "description": "Regression, classification, model evaluation, and practical labs.",
            "status": "Updating",
            "chapters": [
                {
                    "id": "ml-ch-1",
                    "title": "Regression",
                    "order": 1,
                    "summary": "Linear and polynomial regression, intuition and math.",
                    "materials": [
                        {
                            "id": "ml-regression-slides",
                            "title": "Linear Regression Lecture Deck.pptx",
                            "kind": "slides",
                            "size": "5.4 MB",
                            "uploadedAt": "Today",
                            "status": "Draft",
                        }
                    ],
                },
                {
                    "id": "ml-ch-2",
                    "title": "Evaluation",
                    "order": 2,
                    "summary": "Precision, recall, ROC, and choosing the right metric.",
                    "materials": [
                        {
                            "id": "ml-eval-pdf",
                            "title": "Model Evaluation Guide.pdf",
                            "kind": "pdf",
                            "size": "1.7 MB",
                            "uploadedAt": "3 days ago",
                            "status": "Published",
                        }
                    ],
                },
            ],
        },
        {
            "id": "data-structures",
            "title": "Data Structures",
            "description": "Arrays, linked lists, trees, graphs, and algorithmic reasoning.",
            "status": "Draft",
            "chapters": [
                {
                    "id": "ds-ch-1",
                    "title": "Graphs",
                    "order": 1,
                    "summary": "Traversal algorithms with worked examples.",
                    "materials": [
                        {
                            "id": "ds-graphs",
                            "title": "Graph Traversal Worked Examples.pdf",
                            "kind": "pdf",
                            "size": "1.2 MB",
                            "uploadedAt": "Last week",
                            "status": "Published",
                        }
                    ],
                }
            ],
        },
    ],
    "classes": [
        {
            "id": "py-section-b",
            "name": "Section B",
            "courseId": "python-foundations",
            "term": "Spring 2026",
            "schedule": "Mon / Wed 10:00",
            "enrollments": [
                {
                    "studentId": "stu-sara",
                    "progress": 82,
                    "averageScore": 88,
                    "lastActive": "12 min ago",
                    "standing": "Excellent",
                },
                {
                    "studentId": "stu-yassine",
                    "progress": 63,
                    "averageScore": 71,
                    "lastActive": "Today",
                    "standing": "On track",
                },
                {
                    "studentId": "stu-nour",
                    "progress": 39,
                    "averageScore": 56,
                    "lastActive": "3 days ago",
                    "standing": "Needs support",
                },
            ],
        },
        {
            "id": "py-section-c",
            "name": "Section C",
            "courseId": "python-foundations",
            "term": "Spring 2026",
            "schedule": "Tue / Thu 14:00",
            "enrollments": [
                {
                    "studentId": "stu-rim",
                    "progress": 71,
                    "averageScore": 80,
                    "lastActive": "Today",
                    "standing": "On track",
                },
                {
                    "studentId": "stu-karim",
                    "progress": 44,
                    "averageScore": 58,
                    "lastActive": "Yesterday",
                    "standing": "Needs support",
                },
            ],
        },
        {
            "id": "ml-section-a",
            "name": "Section A",
            "courseId": "machine-learning",
            "term": "Spring 2026",
            "schedule": "Mon / Fri 13:00",
            "enrollments": [
                {
                    "studentId": "stu-amine",
                    "progress": 71,
                    "averageScore": 78,
                    "lastActive": "1 hour ago",
                    "standing": "On track",
                },
                {
                    "studentId": "stu-lina",
                    "progress": 54,
                    "averageScore": 66,
                    "lastActive": "Yesterday",
                    "standing": "Needs support",
                },
                {
                    "studentId": "stu-omar",
                    "progress": 90,
                    "averageScore": 92,
                    "lastActive": "Today",
                    "standing": "Excellent",
                },
            ],
        },
        {
            "id": "ds-section-a",
            "name": "Section A",
            "courseId": "data-structures",
            "term": "Spring 2026",
            "schedule": "Wed 09:00",
            "enrollments": [
                {
                    "studentId": "stu-meryem",
                    "progress": 58,
                    "averageScore": 69,
                    "lastActive": "Today",
                    "standing": "On track",
                },
                {
                    "studentId": "stu-ilyas",
                    "progress": 36,
                    "averageScore": 51,
                    "lastActive": "5 days ago",
                    "standing": "Needs support",
                },
            ],
        },
    ],
}

SEED_TEACHER_PROJECTS: list[dict] = [
    {
        "id": "tproj-oop-lab",
        "name": "OOP Lab — Bank Account",
        "tag": "Python",
        "due": "Jun 15, 2026",
        "dueISO": "2026-06-15",
        "nextStep": "Implement the Account class with deposit and withdraw",
        "milestones": [
            {"id": "tproj-oop-lab-m1", "name": "Draw UML class diagram", "done": False},
            {"id": "tproj-oop-lab-m2", "name": "Implement Account class", "done": False},
            {"id": "tproj-oop-lab-m3", "name": "Write unit tests", "done": False},
            {"id": "tproj-oop-lab-m4", "name": "Submit lab report PDF", "done": False},
        ],
        "notes": 0,
        "assignedByTeacher": True,
        "classId": "py-section-b",
    }
]
