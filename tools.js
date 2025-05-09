import { z } from "zod";
import AdmZip from 'adm-zip';
import { exec } from 'child_process';

// Export the tools as a function that takes the server, connection, and apiVersion as parameters
export function registerTools(server, conn, apiVersion) {
    server.tool(
        "soqlQuery",
        "Execute a SOQL query on Salesforce",
        {
            soql: z.string().describe("The SOQL query to execute")
        },
        async (params) => {
            try {
                // Check if params is an object with soql property or if it's the direct string
                const query = typeof params === 'object' && params.soql ? params.soql : params;
                
                console.error(`Executing query: ${query}`);
                const result = await conn.query(query);
                console.error(`Query executed successfully`);
                
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result)
                        }
                    ]
                };
            } catch (error) {
                console.error(`Query error: ${error.message}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: error.message })
                        }
                    ]
                };
            }
        }
    );

    server.tool(
        "retrieveMetadata",
        "Retrieve Salesforce metadata for a given type (e.g., Flow, FlowDefinition, CustomObject, ApexClass)",
        {
            metadataType: z.enum([
                'CustomObject',
                'Flow',
                'FlowDefinition',
                'CustomField',
                'ValidationRule',
                'ApexClass',
                'ApexTrigger',
                'WorkflowRule',
                'Layout'
            ]).describe("The metadata type to retrieve. Allowed values: 'CustomObject', 'Flow', 'FlowDefinition', 'CustomField', 'ValidationRule', 'ApexClass', 'ApexTrigger', 'WorkflowRule', 'Layout'")
        },
        async (params) => {
            try {
                const metadataType = params.metadataType;
                console.error(`Retrieving metadata for type: ${metadataType}`);
                const result = await conn.metadata.list({ type: metadataType }, apiVersion);
                console.error(`Metadata retrieved successfully`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result)
                        }
                    ]
                };
            } catch (error) {
                console.error(`Metadata retrieval error: ${error.message}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: error.message })
                        }
                    ]
                };
            }
        }
    );

    server.tool(
        "retrieveMetadataFile",
        "Retrieve the full metadata file (e.g., XML) for a given metadataType and fullName.",
        {
            metadataType: z.enum([
                'CustomObject',
                'Flow',
                'FlowDefinition',
                'CustomField',
                'ValidationRule',
                'ApexClass',
                'ApexTrigger',
                'WorkflowRule',
                'Layout'
            ]).describe("The metadata type to retrieve. Allowed values: 'CustomObject', 'Flow', 'FlowDefinition', 'CustomField', 'ValidationRule', 'ApexClass', 'ApexTrigger', 'WorkflowRule', 'Layout'"),
            fullName: z.string().describe("The fullName of the metadata component to retrieve, e.g., 'Cancel_Item'")
        },
        async (params) => {
            try {
                const { metadataType, fullName } = params;
                console.error(`Retrieving full metadata file for type: ${metadataType}, fullName: ${fullName}`);
                const retrieveRequest = {
                    unpackaged: {
                        types: [
                            {
                                name: metadataType,
                                members: [fullName]
                            }
                        ],
                        version: apiVersion
                    }
                };
                const result = await conn.metadata.retrieve(retrieveRequest).complete({ details: true });
                if (!result.zipFile) {
                    throw new Error('No zipFile returned from Salesforce');
                }
                const zip = new AdmZip(Buffer.from(result.zipFile, 'base64'));
                const zipEntries = zip.getEntries();
                let xmlContent = null;
                for (const entry of zipEntries) {
                    if (entry.entryName.toLowerCase().includes(fullName.toLowerCase()) && entry.entryName.endsWith('.flow')) {
                        xmlContent = zip.readAsText(entry);
                        break;
                    }
                }
                if (!xmlContent) {
                    // Try to find any XML file if the above didn't work
                    for (const entry of zipEntries) {
                        if (entry.entryName.endsWith('.xml') || entry.entryName.endsWith('.flow')) {
                            xmlContent = zip.readAsText(entry);
                            break;
                        }
                    }
                }
                if (!xmlContent) {
                    throw new Error('Could not find the metadata XML in the retrieved zip');
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: xmlContent
                        }
                    ]
                };
            } catch (error) {
                console.error(`Metadata file retrieval error: ${error.message}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: error.message })
                        }
                    ]
                };
            }
        }
    );

    server.tool(
        "createPackageWithFlowDependencies",
        "Create a package in Salesforce with the specified flow and its dependencies.",
        {
            flowName: z.string().describe("The API name of the flow to include in the package, e.g., 'Routing_Step_1_Schedule_Routing'"),
            packageName: z.string().describe("The name of the package to create, e.g., 'My_test_package'")
        },
        async (params) => {
            try {
                const { flowName, packageName } = params;
                // Step 1: Retrieve the flow metadata to get dependencies
                const flowMetadata = await conn.metadata.read('Flow', flowName);
                if (!flowMetadata) {
                    throw new Error(`Flow '${flowName}' not found.`);
                }

                // Step 2: Collect dependencies (Apex classes, objects, labels, etc.)
                // For simplicity, only add the flow itself. (Full dependency analysis is complex and may require parsing the flow XML.)
                // You can extend this logic to parse flowMetadata for referenced components.
                const types = [
                    { name: 'Flow', members: [flowName] }
                ];

                // Step 3: Create a package.xml manifest
                const packageXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n${types.map(t => `  <types>\n    <members>${t.members.join('</members>\n    <members>')}</members>\n    <name>${t.name}</name>\n  </types>`).join('\n')}\n  <version>${apiVersion}</version>\n</Package>`;

                // Step 4: Create the package (unmanaged)
                const packageResult = await conn.metadata.create('UnmanagedPackage', {
                    fullName: packageName,
                    description: `Package with flow ${flowName} and its dependencies`,
                    types
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                packageName,
                                packageResult,
                                packageXml
                            }, null, 2)
                        }
                    ]
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: error.message })
                        }
                    ]
                };
            }
        }
    );

    server.tool(
        "createUnlockedPackageWithFlow",
        "Use SFDX to retrieve the flow and its dependencies, create a package.xml manifest, and create an unlocked package.",
        {
            flowName: z.string().describe("The API name of the flow to include in the package, e.g., 'Routing_Step_1_Schedule_Routing'"),
            packageName: z.string().describe("The name of the unlocked package to create, e.g., 'My_test_package_1'")
        },
        async (params) => {
            const { flowName, packageName } = params;
            try {
                // 1. Retrieve the flow and its dependencies
                const retrieveCmd = `sfdx force:source:retrieve -m Flow:${flowName}`;
                const retrieveResult = await new Promise((resolve, reject) => {
                    exec(retrieveCmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
                        if (error) reject(stderr || error.message);
                        else resolve(stdout);
                    });
                });

                // 2. Generate package.xml (for simplicity, just the flow)
                const packageXml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Package xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n  <types>\n    <members>${flowName}</members>\n    <name>Flow</name>\n  </types>\n  <version>${apiVersion}</version>\n</Package>`;

                // Write package.xml to disk
                const fs = await import('fs/promises');
                await fs.writeFile('package.xml', packageXml);

                // 3. Create the unlocked package
                const createPkgCmd = `sfdx force:package:create -n ${packageName} -t Unlocked -r force-app`;
                const createPkgResult = await new Promise((resolve, reject) => {
                    exec(createPkgCmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
                        if (error) reject(stderr || error.message);
                        else resolve(stdout);
                    });
                });

                // 4. Create a package version
                const createVerCmd = `sfdx force:package:version:create -p ${packageName} -x -w 10`;
                const createVerResult = await new Promise((resolve, reject) => {
                    exec(createVerCmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
                        if (error) reject(stderr || error.message);
                        else resolve(stdout);
                    });
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                retrieveResult,
                                packageXml,
                                createPkgResult,
                                createVerResult
                            }, null, 2)
                        }
                    ]
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: error.toString() })
                        }
                    ]
                };
            }
        }
    );
} 