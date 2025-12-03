import pandas as pd

# Load the CSV
df = pd.read_csv("sprint_summary.csv")

# Save as Excel
df.to_excel("sprint_summary_v2.xlsx", index=False)
print("Excel file created: sprint_summary_v2.xlsx")
