# Ring-Wing Café Management System - Project Context

## Executive Summary

Ring-Wing is a web-based restaurant management system developed as an undergraduate capstone project by three Computer Studies students (Greg L. Rejuso Jr., Kliean Federicci M. Uriarte, Ruth R. Viray) from Cavite State University - Bacoor Campus for their Bachelor of Science in Information Technology degree. The project was conducted from January 2025 to May 2025 under the supervision of Mr. Alvin D. Catalo, MIT.

The system was specifically designed to address operational challenges at Ring & Wing Café, a small café located at 216 Pilar Road, Almanza Uno, Las Piñas City, which has been operating since June 2023. The café serves 50-80 customers daily, specializing in fried wings and coffee, with peak hours between 5-9 PM.

**Project Type:** Academic Capstone/Thesis Project  
**Industry Focus:** Small Café Operations Management  
**Development Timeline:** January 2025 - May 2025  
**Target Beneficiary:** Ring & Wing Café (Single Location)

---

## Academic Project Context

### Institution and Program
- **University:** Cavite State University - Bacoor Campus
- **Department:** Computer Studies
- **Program:** Bachelor of Science in Information Technology
- **Course:** DCIT 60 – Methods of Research (Capstone Project)
- **Supervisor:** Mr. Alvin D. Catalo, MIT
- **Research Instructor:** Jovelyn D. Ocampo, MIT

### Research Objectives
This study aims to develop a web-based management system for Ring & Wing Café that incorporates essential operational elements, including intelligent customer chatbots and cash disbursement capabilities, with the purpose of enhancing operational efficiency and elevating the quality of services provided.

**Specific Objectives:**
1. Design a Web Based Restaurant Management System tailored for Ring & Wing Café featuring:
   - Order management system for optimized ordering processes
   - Interactive chatbot for enhanced customer service and menu recommendations
   - Inventory management for clear oversight and prevention of stock issues
   - Cash disbursement and expense tracking system for financial organization
   - Point-of-sale (POS) system for seamless sales transactions
   - Payroll management feature for streamlined employee compensation

2. Develop the system using modern web technologies:
   - Frontend: HTML, CSS, React (Vite)
   - Backend: Express.js
   - Database: MongoDB
   - AI Integration: AI API for chatbot functionality

3. Test the system using unit, integration, and user acceptance testing
4. Evaluate the system using ISO/IEC 25010 evaluation criteria
5. Prepare implementation plan for deployment

---

## Problem Statement and Business Context

### Current Café Operations
Ring & Wing Café is a small establishment that has built a loyal customer base over two years of operation. However, the business faces significant operational challenges due to its reliance on manual processes:

**Current Operational Setup:**
- **Location:** 216 Pilar Road, Almanza Uno, Las Piñas City
- **Staff Size:** 5 employees total
- **Daily Customers:** 50-80 customers (peak: 5-9 PM)
- **Business Focus:** Fried wings, coffee, and food options
- **Target Market:** Students and working professionals (primarily dine-in)

### Identified Problems (From Business Owner Interview)

#### 1. Manual Expense Tracking Issues
- **Problem:** All expenses tracked manually on paper, prone to errors
- **Impact:** Inaccurate financial records, difficulty tracking costs and income
- **Owner Quote:** "First is the manually tracking of expenses, since it's prone to errors and often not accurate. I want all of the expenses, both inside and outside expenses to be recorded."

#### 2. Slow Order Processing
- **Problem:** Manual order taking creates bottlenecks during peak hours
- **Impact:** Long queues, delayed service, customer dissatisfaction
- **Process:** Staff writes orders in logbook → transfers to order slip → sends to kitchen

#### 3. Inventory Management Challenges
- **Problem:** Frequent stockouts of ingredients (soy sauce, vinegar, seasonings)
- **Impact:** Emergency store trips, ingredient expiration due to overstocking
- **Owner Quote:** "We often run out of ingredients... forcing us to make quick trips to the store"

#### 4. Order Accuracy Issues
- **Problem:** Communication errors between counter staff and kitchen
- **Impact:** Wrong orders served, customer complaints about delays
- **Root Cause:** Handwriting legibility issues, order sequence confusion

#### 5. Payroll Management Difficulties
- **Problem:** Manual payroll calculations based on Messenger photos for attendance
- **Impact:** Calculation errors, time-consuming process
- **Owner Quote:** "It's difficult because I have to do the computation manually... sometimes I made a mistake in computing their salary"

---

## Proposed Solution Features

### Core System Modules

#### 1. Order Management System
- **Purpose:** Optimize ordering process and reduce manual bottlenecks
- **Features:** Digital order taking, kitchen integration, order tracking
- **Expected Impact:** Faster service, reduced queues, improved accuracy

#### 2. Smart Customer Chatbot
- **Purpose:** Enhance customer service and reduce staff workload
- **Features:** Menu recommendations, order assistance, FAQ responses
- **Technology:** AI API integration for natural language processing
- **Expected Impact:** 24/7 customer support, improved customer engagement

#### 3. Inventory Management
- **Purpose:** Prevent stockouts and overstocking
- **Features:** Real-time stock tracking, low stock alerts, expiration monitoring
- **Expected Impact:** Reduced waste, better procurement planning, cost control

#### 4. Cash Disbursement and Expense Tracking
- **Purpose:** Systematic expense categorization and financial monitoring
- **Features:** Digital expense entry, categorization, financial reporting
- **Expected Impact:** Accurate financial records, better cost analysis

#### 5. Point-of-Sale (POS) System
- **Purpose:** Streamline sales transactions
- **Features:** Multiple payment methods (cash, card, e-wallet), receipt generation
- **Expected Impact:** Faster transactions, accurate sales recording

#### 6. Payroll Management
- **Purpose:** Automate employee compensation calculations
- **Features:** Attendance tracking, salary calculations, payslip generation
- **Expected Impact:** Reduced errors, time savings, transparent payroll process

---

## Technical Implementation

### Development Methodology
**Agile Scrum Approach:**
- **Sprint Duration:** 1-2 weeks
- **Team Structure:** 3-person development team
- **Process:** Planning → Requirements Analysis → Design → Building → Testing
- **Quality Assurance:** Unit testing, integration testing, user acceptance testing

### Technology Stack
- **Frontend Framework:** React.js with Vite build system
- **Styling:** HTML5, CSS3, responsive design
- **Backend Framework:** Express.js (Node.js)
- **Database:** MongoDB (NoSQL document-oriented)
- **AI Integration:** External AI API for chatbot functionality
- **Architecture:** Web-based system accessible via browsers

### System Architecture
**User Roles and Access:**
- **Admin:** Full system access, account management, reports, payroll oversight
- **Employees:** Order processing, inventory updates, POS operations, personal payroll view
- **Customers:** Product browsing, order placement, chatbot interaction
- **Suppliers:** (Future consideration for supply chain integration)

---

## Academic Evaluation Framework

### Testing Strategy
1. **Functional Testing:** Verification of core system functionalities
2. **Usability Testing:** Real user feedback from café staff and customers
3. **Performance Testing:** System responsiveness under various load conditions
4. **Integration Testing:** Module interconnectivity and data flow validation

### Evaluation Criteria (ISO/IEC 25010)
The system will be evaluated using international software quality standards:

**Quality Characteristics:**
- **Functionality:** Feature completeness and correctness
- **Reliability:** System stability and error handling
- **Usability:** User interface design and ease of use
- **Performance Efficiency:** Response times and resource utilization
- **Security:** Data protection and access control
- **Maintainability:** Code quality and system adaptability

**Evaluation Method:**
- 5-point Likert scale survey (1=Poor to 5=Excellent)
- Target participants: Admin, employees, and customers
- Success criteria: Average rating of 3.51+ (Very Good) across all categories

---

## Project Scope and Limitations

### Included Features
- Web-based café management system for single location
- Order automation and processing workflow
- Real-time inventory tracking and management
- AI-powered customer service chatbot
- Multi-method payment processing (cash, card, e-wallet)
- Employee attendance and payroll management
- Financial expense tracking and reporting
- Role-based access control for different user types

### System Limitations
- **Single Location:** Designed specifically for Ring & Wing Café only
- **No Reservations:** Does not include table reservation management
- **No Loyalty Programs:** Customer loyalty features not implemented
- **No Delivery Integration:** No integration with third-party delivery platforms
- **Payment Processing:** Records payment methods but not integrated with actual banks/e-wallets
- **Security Level:** Basic security with username/password authentication
- **Testing Scope:** Limited testing due to time and budget constraints
- **Performance:** Not tested for high-volume concurrent users

---

## Expected Outcomes and Benefits

### For Ring & Wing Café
1. **Operational Efficiency:** Reduced manual processes and administrative burden
2. **Accuracy Improvement:** Minimized human errors in orders, inventory, and payroll
3. **Cost Control:** Better expense tracking and financial visibility
4. **Customer Satisfaction:** Faster service and improved order accuracy
5. **Staff Productivity:** Automated routine tasks allowing focus on customer service

### For Academic Learning
1. **Technical Skills:** Hands-on experience with modern web development technologies
2. **Project Management:** Agile methodology implementation and team collaboration
3. **Problem-Solving:** Real-world business problem analysis and solution design
4. **Research Skills:** Literature review, data collection, and academic writing
5. **System Evaluation:** Software quality assessment using international standards

### For Future Research
1. **Reference Material:** Baseline for similar café management system studies
2. **Methodology Validation:** Agile approach effectiveness in academic projects
3. **Technology Assessment:** React/Express/MongoDB stack evaluation for SME solutions
4. **User Acceptance:** Insights into small business technology adoption factors

---

## Implementation Timeline

### Development Phases (January - May 2025)

**Phase 1: Research and Planning (January 2025)**
- Literature review and related studies analysis
- Business requirements gathering through interviews
- System design and architecture planning
- Technology stack selection and setup

**Phase 2: System Development (February - March 2025)**
- Core module development (POS, inventory, orders)
- Database design and implementation
- User interface design and frontend development
- API development and backend integration

**Phase 3: AI Integration and Testing (April 2025)**
- Chatbot development and AI API integration
- System integration testing
- User acceptance testing with café staff
- Bug fixes and performance optimization

**Phase 4: Evaluation and Documentation (May 2025)**
- ISO/IEC 25010 evaluation with user surveys
- System documentation and user manuals
- Implementation plan preparation
- Final thesis manuscript completion

---

## Success Metrics and Validation

### Quantitative Measures
- **System Usability Scale (SUS):** Target score of 70+ (Good usability)
- **ISO/IEC 25010 Ratings:** Average 3.5+ across all quality characteristics
- **Performance Metrics:** Page load times under 3 seconds
- **Error Reduction:** Measurable decrease in order and inventory errors

### Qualitative Measures
- **User Satisfaction:** Positive feedback from café owner and staff
- **Operational Impact:** Observed improvements in daily operations
- **Academic Quality:** Successful thesis defense and faculty approval
- **Learning Objectives:** Demonstrated competency in system development

### Validation Methods
- **User Interviews:** Before and after system implementation
- **Direct Observation:** Workflow efficiency improvements
- **System Logs:** Usage patterns and error tracking
- **Academic Review:** Faculty evaluation and peer assessment

---

## Future Development Opportunities

### Immediate Enhancements (Post-Graduation)
- **Mobile Application:** Native iOS and Android apps for mobile ordering
- **Advanced Reporting:** Business intelligence and analytics dashboard
- **Multi-location Support:** Expansion to handle multiple café branches
- **Third-party Integrations:** Payment gateways and delivery platform APIs

### Long-term Possibilities
- **Franchise Solution:** Adapting system for café franchise operations
- **Industry Expansion:** Customization for different restaurant types
- **AI Enhancement:** More sophisticated chatbot capabilities and recommendations
- **IoT Integration:** Smart kitchen equipment and sensor connectivity

---

This project context serves as a comprehensive reference for understanding Ring-Wing as an academic capstone project that addresses real-world small business challenges through practical application of modern web technologies. The system demonstrates the potential for student-developed solutions to create meaningful impact in local business communities while providing valuable learning experiences in software development, project management, and user-centered design.

---

## Research Methodology and Academic Framework

### Literature Review Foundation
The project is grounded in comprehensive research of both foreign and local literature covering:

**Foreign Literature:**
- Supply chain management and POS applications (Daho, 2021)
- IoT's impact on point-of-sale terminals (Gerlée, 2024)
- AI-driven chatbots in financial services (Fitsak, 2024)
- State-of-the-art chatbot designs and applications (Luo et al., 2022)

**Local Literature:**
- Payroll trends in the Philippines (PeopleStrong Philippines)
- Inventory management systems for local businesses (Roque & Montiague, 2021)
- Electronic menu ordering systems (Diamante et al., 2024)
- Kiosk revolution in Philippine fast food (Borbon, 2024)

**Related Studies:**
- Web-based payroll management systems (Ahmed et al., 2023)
- Online food ordering with chatbots (Jalaludin & Azizan, 2023)
- POS systems for automotive industry (Melvin & Wiratama, 2023)
- AI chatbots in Nueva Ecija online shops (Pastorfide & Vasquez, 2025)

### Conceptual Framework
The study employs an Input-Process-Output (IPO) model:

**Input:**
- Software requirements: React, Express.js, MongoDB, AI API
- Hardware requirements: Dual-core processor, 4GB RAM, 10GB storage
- Human resources: 3-person development team
- Literature and research data

**Process:**
- Agile Scrum methodology implementation
- Requirements analysis and system design
- Iterative development with sprint cycles
- Continuous testing and feedback integration
- User acceptance testing and evaluation

**Output:**
- Functional web-based café management system
- Academic thesis manuscript
- System evaluation using ISO/IEC 25010
- Implementation plan for Ring & Wing Café

---

## System Requirements and Specifications

### Functional Requirements
1. **User Authentication and Role Management**
   - Secure login system for Admin, Employee, and Customer roles
   - Role-based access control (RBAC) implementation
   - User session management and security

2. **Order Management System**
   - Digital order taking and processing
   - Kitchen display integration
   - Order status tracking and updates
   - Order modification and cancellation capabilities

3. **Inventory Management**
   - Real-time stock level monitoring
   - Automatic low stock alerts
   - Ingredient expiration tracking
   - Stock movement logging and audit trails

4. **Point-of-Sale (POS) Operations**
   - Multi-payment method support (cash, card, e-wallet)
   - Receipt generation and printing
   - Sales transaction recording
   - Daily sales reporting

5. **AI-Powered Chatbot**
   - Natural language processing for customer queries
   - Menu recommendations and suggestions
   - Order assistance and support
   - 24/7 automated customer service

6. **Payroll and Attendance Management**
   - Digital time tracking system
   - Automated salary calculations
   - Payslip generation and distribution
   - Attendance monitoring and reporting

7. **Cash Disbursement and Expense Tracking**
   - Digital expense entry and categorization
   - Financial reporting and analytics
   - Budget monitoring and cost control
   - Audit trail for all financial transactions

### Non-Functional Requirements
1. **Usability:** Intuitive interface design for non-technical users
2. **Performance:** System responsiveness under normal café load
3. **Reliability:** Stable operation during business hours
4. **Security:** Basic data protection and access control
5. **Compatibility:** Cross-browser support for web access
6. **Maintainability:** Clean code structure for future enhancements

---

## Development Approach and Quality Assurance

### Agile Scrum Implementation
**Sprint Structure:**
- Duration: 1-2 weeks per sprint
- Planning meetings: Sprint goal definition and task assignment
- Daily standups: Progress tracking and impediment resolution
- Sprint reviews: Stakeholder feedback and demo sessions
- Retrospectives: Process improvement and lessons learned

**Team Roles:**
- **Product Owner:** Kliean Federicci M. Uriarte (Requirements and stakeholder communication)
- **Scrum Master:** Greg L. Rejuso Jr. (Process facilitation and team coordination)
- **Developer:** Ruth R. Viray (Technical implementation and testing)

### Quality Assurance Framework
**Testing Levels:**
1. **Unit Testing:** Individual component functionality verification
2. **Integration Testing:** Module interconnection and data flow testing
3. **System Testing:** End-to-end functionality validation
4. **User Acceptance Testing:** Real user feedback and approval

**Evaluation Methodology:**
- ISO/IEC 25010 software quality model implementation
- 5-point Likert scale survey instrument (1=Poor to 5=Excellent)
- Statistical analysis of user satisfaction ratings
- Descriptive interpretation of evaluation results

**Success Criteria:**
- Average rating of 3.51-4.50 (Very Good) across all quality characteristics
- Positive user feedback from café staff and management
- Successful completion of all functional requirements
- Academic approval and thesis defense success

---

## Academic Contribution and Significance

### Research Contribution
1. **Practical Application:** Real-world implementation of web-based management system for small café operations
2. **Technology Integration:** Demonstration of modern web stack (React/Express/MongoDB) effectiveness for SME solutions
3. **AI Implementation:** Practical application of AI chatbot technology in local food service context
4. **Methodology Validation:** Agile Scrum effectiveness in academic project management

### Educational Value
1. **Technical Skills Development:** Full-stack web development experience using industry-standard technologies
2. **Project Management:** Hands-on experience with Agile methodologies and team collaboration
3. **Problem-Solving:** Analysis and solution of real business operational challenges
4. **Research Methodology:** Proper academic research process and documentation

### Industry Relevance
1. **Digital Transformation:** Addresses growing need for small business digitalization in the Philippines
2. **Technology Adoption:** Demonstrates feasibility of modern web technologies for local SMEs
3. **Cost-Effective Solutions:** Shows potential for affordable, custom-built systems vs. expensive commercial solutions
4. **Local Market Understanding:** Tailored solution addressing specific Philippine business context and requirements

---

## System Architecture and Technical Design

### Frontend Architecture
**React.js Implementation:**
- Component-based architecture for reusable UI elements
- State management for dynamic user interactions
- Responsive design for cross-device compatibility
- Modern ES6+ JavaScript features and best practices

**User Interface Design:**
- Intuitive navigation for non-technical café staff
- Mobile-responsive layout for tablet and smartphone access
- Consistent design language and user experience
- Accessibility considerations for diverse user base

### Backend Architecture
**Express.js Server:**
- RESTful API design for frontend-backend communication
- Middleware implementation for authentication and authorization
- Route management for different user roles and permissions
- Error handling and logging for system reliability

**Database Design:**
- MongoDB document-oriented data modeling
- Optimized schemas for café operations data
- Indexing strategy for performance optimization
- Data validation and integrity constraints

### Integration Strategy
**AI Chatbot Integration:**
- External AI API consumption for natural language processing
- Context management for conversational interactions
- Integration with existing menu and order systems
- Fallback mechanisms for API unavailability

**Security Implementation:**
- User authentication and session management
- Role-based access control (RBAC) system
- Data validation and sanitization
- Basic security measures for academic project scope

---

## Evaluation and Validation Framework

### ISO/IEC 25010 Quality Model
**Functionality:** Degree to which software provides functions that meet stated and implied needs
- Functional completeness: All required features implemented
- Functional correctness: Accurate results and calculations
- Functional appropriateness: Suitable for café operations

**Usability:** Degree to which software can be used by specified users to achieve specified goals
- Appropriateness recognizability: Clear purpose and functionality
- Learnability: Easy to learn for café staff
- Operability: Simple and intuitive operation
- User interface aesthetics: Pleasant and professional design

**Reliability:** Degree to which system performs specified functions under specified conditions
- Maturity: System stability and error frequency
- Availability: System uptime during business hours
- Fault tolerance: Graceful handling of errors
- Recoverability: Quick recovery from failures

**Performance Efficiency:** Performance relative to amount of resources used
- Time behavior: Response times for user actions
- Resource utilization: Efficient use of system resources
- Capacity: Ability to handle expected café load

### Data Collection and Analysis
**Survey Instrument:**
- Structured questionnaire based on ISO/IEC 25010 characteristics
- 5-point Likert scale for quantitative measurement
- Open-ended questions for qualitative feedback
- Demographic information for context analysis

**Participant Selection:**
- Café owner and management (Admin role testing)
- Café staff members (Employee role testing)
- Regular customers (Customer role testing)
- System developers (Technical evaluation)

**Analysis Methods:**
- Descriptive statistics for Likert scale responses
- Mean score calculation and interpretation
- Thematic analysis for qualitative feedback
- Comparative analysis across user groups

---

This updated project context accurately reflects Ring-Wing as an academic capstone project focused on solving real operational challenges for a specific small café through practical application of modern web development technologies, while maintaining rigorous academic standards and evaluation methodology.
